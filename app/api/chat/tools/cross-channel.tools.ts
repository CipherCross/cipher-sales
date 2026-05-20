import { tool, zodSchema } from "ai";
import { z } from "zod";
import { and, count, desc, isNotNull, lt, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { outreach, upworkBids, upworkOutreach } from "@/db/schema";
import { stringDateRange, timestampDateRange } from "./shared/conditions";
import { pct, repliedCountExpr } from "./shared/metrics";
import { withToolError } from "./shared/withToolError";

export const crossChannelTools = {
  // ── 16. Cross-channel summary ───────────────────────────────────────────
  getCrossChannelSummary: tool({
    description:
      "Combined summary of LinkedIn and Upwork performance in one call. " +
      "Returns: LinkedIn (total outreach, connected, replied, reply rate, top response category, overdue follow-ups), " +
      "Upwork Bids (sent, viewed, replied, interviews, reply rate, avg connects/reply), " +
      "Upwork Outreach (total, replied, calls booked, estimates sent, estimates won). " +
      "Optionally filter by date range.",
    inputSchema: zodSchema(
      z.object({
        startDate: z
          .string()
          .optional()
          .describe("Start date (YYYY-MM-DD inclusive). Applied to start_date / proposal_sent."),
        endDate: z
          .string()
          .optional()
          .describe("End date (YYYY-MM-DD inclusive). Applied to start_date / proposal_sent."),
      }),
    ),
    execute: withToolError(async ({ startDate, endDate }) => {
      // ── LinkedIn ──────────────────────────────────────────────────────
      const liDateConds = stringDateRange(outreach.startDate, startDate, endDate);

      const liRows = await db
        .select({
          total: count(),
          connected: sql<number>`COUNT(${outreach.connectedDate})`,
          replied: repliedCountExpr(outreach.outreachStatus),
        })
        .from(outreach)
        .where(liDateConds.length > 0 ? and(...liDateConds) : undefined);

      // Bug 3 fix: liDateConds filters by outreach.startDate (campaign start date).
      // Spreading it into the overdue query incorrectly excluded overdue leads from
      // older campaigns. Overdue means next_action_date < today — no campaign date
      // filter should be applied here.
      const liOverdue = await db
        .select({ count: count() })
        .from(outreach)
        .where(lt(outreach.nextActionDate, new Date().toISOString().split("T")[0]));

      const topCatRows = await db
        .select({ category: outreach.responseCategory, count: count() })
        .from(outreach)
        .where(and(isNotNull(outreach.responseCategory), ...liDateConds))
        .groupBy(outreach.responseCategory)
        .orderBy(desc(count()))
        .limit(1);

      // ── Upwork Bids ───────────────────────────────────────────────────
      const ubDateConds = timestampDateRange(upworkBids.proposalSent, startDate, endDate);

      const ubRows = await db
        .select({
          sent: count(),
          viewed: sql<number>`COUNT(CASE WHEN ${upworkBids.viewStatus} = 'Viewed' THEN 1 END)`,
          replied: sql<number>`COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)`,
          interviews: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.interviews} > 0 THEN 1 ELSE 0 END), 0)`,
          totalConnects: sql<number>`COALESCE(SUM(${upworkBids.connectsSpent}), 0)`,
        })
        .from(upworkBids)
        .where(ubDateConds.length > 0 ? and(...ubDateConds) : undefined);

      // ── Upwork Outreach ───────────────────────────────────────────────
      const uoDateConds = timestampDateRange(upworkOutreach.proposalSent, startDate, endDate);

      const uoRows = await db
        .select({
          total: count(),
          replied: sql<number>`COUNT(${upworkOutreach.replyDate})`,
          callsBooked: sql<number>`COUNT(CASE WHEN ${upworkOutreach.initialCallStatus} IN ('Booked', 'Completed') THEN 1 END)`,
          // Bug 7 fix: exclude empty strings — COUNT(col) counts non-NULL values
          // including empty strings, which would overcount estimates sent.
          estimatesSent: sql<number>`COUNT(CASE WHEN ${upworkOutreach.estimateLink} IS NOT NULL AND ${upworkOutreach.estimateLink} != '' THEN 1 END)`,
          estimatesWon: sql<number>`COUNT(CASE WHEN ${upworkOutreach.estimateResult} = 'Successful' THEN 1 END)`,
        })
        .from(upworkOutreach)
        .where(uoDateConds.length > 0 ? and(...uoDateConds) : undefined);

      // ── Assemble result ───────────────────────────────────────────────
      // Bug 9 fix: guard all three aggregate rows against empty result sets.
      const li = liRows[0] ?? { total: 0, connected: 0, replied: 0 };
      const liTotal = li.total;
      const liReplied = Number(li.replied);

      const ub = ubRows[0] ?? { sent: 0, viewed: 0, replied: 0, interviews: 0, totalConnects: 0 };
      const ubReplied = Number(ub.replied);
      const ubTotalConnects = Number(ub.totalConnects);

      const uo = uoRows[0] ?? { total: 0, replied: 0, callsBooked: 0, estimatesSent: 0, estimatesWon: 0 };

      return {
        linkedin: {
          totalOutreach: liTotal,
          connected: Number(li.connected),
          replied: liReplied,
          replyRatePct: pct(liReplied, liTotal),
          topResponseCategory: topCatRows[0]?.category ?? null,
          overdueFollowUps: liOverdue[0].count,
        },
        upworkBids: {
          sent: ub.sent,
          viewed: Number(ub.viewed),
          replied: ubReplied,
          interviews: Number(ub.interviews),
          replyRatePct: pct(ubReplied, ub.sent),
          avgConnectsPerReply: ubReplied > 0 ? +(ubTotalConnects / ubReplied).toFixed(1) : null,
        },
        upworkOutreach: {
          total: uo.total,
          replied: Number(uo.replied),
          callsBooked: Number(uo.callsBooked),
          estimatesSent: Number(uo.estimatesSent),
          estimatesWon: Number(uo.estimatesWon),
        },
      };
    }),
  }),

  // ── 19. Period-over-period comparison ───────────────────────────────────
  getPeriodComparison: tool({
    description:
      "Compare the most recent trailing window of N days against the immediately preceding window of N days, " +
      "for one channel. Returns each key metric with its current value, previous value, absolute delta, and " +
      "percent change — so the team can see what is improving or declining week-over-week. " +
      "Use this whenever the user asks 'how are we doing vs last week/period' or wants recent momentum.",
    inputSchema: zodSchema(
      z.object({
        channel: z
          .enum(["linkedin", "upworkBids", "upworkOutreach"])
          .describe("Which pipeline to compare."),
        windowDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("Length of each comparison window in days. Defaults to 7 (this week vs last week)."),
      }),
    ),
    execute: withToolError(async ({ channel, windowDays }) => {
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const today = new Date();
      const curStartD = new Date(today);
      curStartD.setDate(curStartD.getDate() - windowDays);
      const prevStartD = new Date(today);
      prevStartD.setDate(prevStartD.getDate() - 2 * windowDays);
      const curStart = fmt(curStartD);
      const prevStart = fmt(prevStartD);

      const buildMetric = (name: string, current: number, previous: number) => ({
        metric: name,
        current,
        previous,
        deltaAbs: current - previous,
        deltaPct: previous > 0 ? +(((current - previous) / previous) * 100).toFixed(1) : null,
      });

      // Counts rows whose date column falls in the current vs previous window.
      const curCount = (col: AnyColumn) =>
        sql<number>`COUNT(CASE WHEN ${col} >= ${curStart} THEN 1 END)`;
      const prevCount = (col: AnyColumn) =>
        sql<number>`COUNT(CASE WHEN ${col} >= ${prevStart} AND ${col} < ${curStart} THEN 1 END)`;

      const windowMeta = {
        currentWindow: { start: curStart, end: fmt(today) },
        previousWindow: { start: prevStart, end: curStart },
      };

      if (channel === "linkedin") {
        const rows = await db
          .select({
            curStarted: curCount(outreach.startDate),
            prevStarted: prevCount(outreach.startDate),
            curConnected: curCount(outreach.connectedDate),
            prevConnected: prevCount(outreach.connectedDate),
            curReplied: curCount(outreach.repliedDate),
            prevReplied: prevCount(outreach.repliedDate),
          })
          .from(outreach);
        const r = rows[0];
        return {
          channel,
          windowDays,
          ...windowMeta,
          metrics: [
            buildMetric("outreachStarted", Number(r.curStarted), Number(r.prevStarted)),
            buildMetric("connections", Number(r.curConnected), Number(r.prevConnected)),
            buildMetric("replies", Number(r.curReplied), Number(r.prevReplied)),
          ],
        };
      }

      if (channel === "upworkBids") {
        const rows = await db
          .select({
            curSent: curCount(upworkBids.proposalSent),
            prevSent: prevCount(upworkBids.proposalSent),
            curViewed: curCount(upworkBids.viewDate),
            prevViewed: prevCount(upworkBids.viewDate),
            curReplied: curCount(upworkBids.replyDate),
            prevReplied: prevCount(upworkBids.replyDate),
            curConnects: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.proposalSent} >= ${curStart} THEN ${upworkBids.connectsSpent} END), 0)`,
            prevConnects: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.proposalSent} >= ${prevStart} AND ${upworkBids.proposalSent} < ${curStart} THEN ${upworkBids.connectsSpent} END), 0)`,
          })
          .from(upworkBids);
        const r = rows[0];
        return {
          channel,
          windowDays,
          ...windowMeta,
          metrics: [
            buildMetric("bidsSent", Number(r.curSent), Number(r.prevSent)),
            buildMetric("viewed", Number(r.curViewed), Number(r.prevViewed)),
            buildMetric("replied", Number(r.curReplied), Number(r.prevReplied)),
            buildMetric("connectsSpent", Number(r.curConnects), Number(r.prevConnects)),
          ],
        };
      }

      // channel === "upworkOutreach"
      const rows = await db
        .select({
          curNew: curCount(upworkOutreach.proposalSent),
          prevNew: prevCount(upworkOutreach.proposalSent),
          curReplied: curCount(upworkOutreach.replyDate),
          prevReplied: prevCount(upworkOutreach.replyDate),
          curCalls: curCount(upworkOutreach.initialCallDate),
          prevCalls: prevCount(upworkOutreach.initialCallDate),
        })
        .from(upworkOutreach);
      const r = rows[0];
      return {
        channel,
        windowDays,
        ...windowMeta,
        metrics: [
          buildMetric("newDeals", Number(r.curNew), Number(r.prevNew)),
          buildMetric("replies", Number(r.curReplied), Number(r.prevReplied)),
          buildMetric("initialCalls", Number(r.curCalls), Number(r.prevCalls)),
        ],
      };
    }),
  }),
};
