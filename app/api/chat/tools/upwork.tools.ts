import { tool, zodSchema } from "ai";
import { z } from "zod";
import { and, count, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { upworkBids, upworkOutreach } from "@/db/schema";
import { timestampDateRange } from "./shared/conditions";
import { pct } from "./shared/metrics";
import { withToolError } from "./shared/withToolError";

export const upworkTools = {
  // ── 11. Upwork bids funnel ──────────────────────────────────────────────
  getUpworkBidsFunnel: tool({
    description:
      "Upwork proposals/bids conversion funnel: Sent → Viewed → Replied → Interview. " +
      "Shows counts at each stage and overall conversion percentages. " +
      "Optionally filter by Upwork profile or date range on proposal_sent.",
    inputSchema: zodSchema(
      z.object({
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ profile, startDate, endDate }) => {
      const conditions = [...timestampDateRange(upworkBids.proposalSent, startDate, endDate)];
      if (profile) conditions.push(eq(upworkBids.profile, profile));

      const rows = await db
        .select({
          totalSent: count(),
          viewed: sql<number>`COUNT(CASE WHEN ${upworkBids.viewStatus} = 'Viewed' THEN 1 END)`,
          replied: sql<number>`COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)`,
          interviews: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.interviews} > 0 THEN 1 ELSE 0 END), 0)`,
        })
        .from(upworkBids)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Bug 9 fix: guard against empty result set (e.g. date filter matches nothing)
      const r = rows[0] ?? { totalSent: 0, viewed: 0, replied: 0, interviews: 0 };
      const sent = r.totalSent;
      const viewed = Number(r.viewed);
      const replied = Number(r.replied);
      const interviews = Number(r.interviews);

      return {
        sent,
        viewed,
        replied,
        interviews,
        viewRatePct: pct(viewed, sent),
        replyRatePct: pct(replied, sent),
        interviewRatePct: pct(interviews, sent),
        viewToReplyPct: pct(replied, viewed),
        replyToInterviewPct: pct(interviews, replied),
      };
    }),
  }),

  // ── 12. Upwork bid performance by dimension ─────────────────────────────
  getUpworkBidPerformance: tool({
    description:
      "Group Upwork bids by a chosen dimension to compare performance. " +
      "Dimensions: profile, searchName, managerName, jobQuality, boosted, clientCountry. " +
      "Returns: dimension value, bids sent, views, replies, interviews, view %, reply %, avg connects spent.",
    inputSchema: zodSchema(
      z.object({
        groupBy: z
          .enum(["profile", "searchName", "managerName", "jobQuality", "boosted", "clientCountry"])
          .describe("Dimension to group bids by."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ groupBy, startDate, endDate }) => {
      const dimMap = {
        profile: upworkBids.profile,
        searchName: upworkBids.searchName,
        managerName: upworkBids.managerName,
        jobQuality: upworkBids.jobQuality,
        boosted: upworkBids.boosted,
        clientCountry: upworkBids.clientCountry,
      } as const;
      const dimColumn = dimMap[groupBy];

      const conditions = [isNotNull(dimColumn), ...timestampDateRange(upworkBids.proposalSent, startDate, endDate)];

      const rows = await db
        .select({
          dimension: dimColumn,
          sent: count(),
          viewed: sql<number>`COUNT(CASE WHEN ${upworkBids.viewStatus} = 'Viewed' THEN 1 END)`,
          replied: sql<number>`COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)`,
          interviews: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.interviews} > 0 THEN 1 ELSE 0 END), 0)`,
          avgConnects: sql<number>`ROUND(AVG(${upworkBids.connectsSpent})::numeric, 1)`,
        })
        .from(upworkBids)
        .where(and(...conditions))
        .groupBy(dimColumn)
        .orderBy(desc(count()));

      return rows.map((r) => {
        const sent = r.sent;
        const viewed = Number(r.viewed);
        const replied = Number(r.replied);
        const interviews = Number(r.interviews);
        return {
          [groupBy]: r.dimension,
          sent,
          viewed,
          replied,
          interviews,
          viewPct: pct(viewed, sent),
          replyPct: pct(replied, sent),
          avgConnectsSpent: Number(r.avgConnects) || 0,
        };
      });
    }),
  }),

  // ── 13. Upwork connects ROI ─────────────────────────────────────────────
  getUpworkConnectsROI: tool({
    description:
      "Calculate Upwork connects efficiency: total connects spent, total bids, replies, interviews, " +
      "and derived metrics connects-per-reply and connects-per-interview. " +
      "Filterable by profile, date range, and boosted vs organic.",
    inputSchema: zodSchema(
      z.object({
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        boosted: z
          .enum(["TRUE", "FALSE"])
          .optional()
          .describe('Filter by boosted status: "TRUE" or "FALSE". Omit for all.'),
      }),
    ),
    execute: withToolError(async ({ profile, startDate, endDate, boosted }) => {
      const conditions = [...timestampDateRange(upworkBids.proposalSent, startDate, endDate)];
      if (profile) conditions.push(eq(upworkBids.profile, profile));
      if (boosted) conditions.push(eq(upworkBids.boosted, boosted));

      const rows = await db
        .select({
          totalBids: count(),
          totalConnects: sql<number>`COALESCE(SUM(${upworkBids.connectsSpent}), 0)`,
          replied: sql<number>`COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)`,
          interviews: sql<number>`COALESCE(SUM(CASE WHEN ${upworkBids.interviews} > 0 THEN 1 ELSE 0 END), 0)`,
        })
        .from(upworkBids)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Bug 9 fix: guard against empty result set (e.g. date filter matches nothing)
      const r = rows[0] ?? { totalBids: 0, totalConnects: 0, replied: 0, interviews: 0 };
      const totalConnects = Number(r.totalConnects);
      const replied = Number(r.replied);
      const interviews = Number(r.interviews);

      return {
        totalBids: r.totalBids,
        totalConnects,
        replied,
        interviews,
        connectsPerReply: replied > 0 ? +(totalConnects / replied).toFixed(1) : null,
        connectsPerInterview: interviews > 0 ? +(totalConnects / interviews).toFixed(1) : null,
        avgConnectsPerBid: r.totalBids > 0 ? +(totalConnects / r.totalBids).toFixed(1) : 0,
      };
    }),
  }),

  // ── 14. Upwork outreach pipeline ────────────────────────────────────────
  getUpworkOutreachPipeline: tool({
    description:
      "Upwork direct-outreach deal pipeline funnel. " +
      "Shows counts at each stage: New → First contact → Negotiations → Call Booked → Estimating → " +
      "Estimate presentation → Contract Signed, plus Lost and Dropped. " +
      "Also shows call booking, completion, estimate sent, and estimate won counts. " +
      "Optionally filter by profile, stage, or date range.",
    inputSchema: zodSchema(
      z.object({
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        stage: z.string().optional().describe('Filter by specific stage (e.g. "Call Booked", "Estimating").'),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ profile, stage, startDate, endDate }) => {
      const baseConds = [
        ...(profile ? [eq(upworkOutreach.profile, profile)] : []),
        ...timestampDateRange(upworkOutreach.proposalSent, startDate, endDate),
      ];

      // Part 1: Stage counts — includes the optional stage filter
      const stageConds = [...baseConds, ...(stage ? [eq(upworkOutreach.stage, stage)] : [])];
      const stageRows = await db
        .select({ stage: upworkOutreach.stage, count: count() })
        .from(upworkOutreach)
        .where(stageConds.length > 0 ? and(...stageConds) : undefined)
        .groupBy(upworkOutreach.stage);

      // Part 2: Funnel metrics — no stage filter, always shows the full pipeline
      const metricRows = await db
        .select({
          total: count(),
          viewed: sql<number>`COUNT(${upworkOutreach.viewDate})`,
          replied: sql<number>`COUNT(${upworkOutreach.replyDate})`,
          initialCallBooked: sql<number>`COUNT(CASE WHEN ${upworkOutreach.initialCallStatus} IN ('Booked', 'Completed') THEN 1 END)`,
          initialCallCompleted: sql<number>`COUNT(CASE WHEN ${upworkOutreach.initialCallStatus} = 'Completed' THEN 1 END)`,
          secondCallBooked: sql<number>`COUNT(CASE WHEN ${upworkOutreach.secondCallStatus} IN ('Booked', 'Completed') THEN 1 END)`,
          // Bug 7 fix: COUNT(column) counts non-NULL values but also empty strings;
          // explicitly exclude empty strings so only real estimate links are counted.
          estimateSent: sql<number>`COUNT(CASE WHEN ${upworkOutreach.estimateLink} IS NOT NULL AND ${upworkOutreach.estimateLink} != '' THEN 1 END)`,
          estimateWon: sql<number>`COUNT(CASE WHEN ${upworkOutreach.estimateResult} = 'Successful' THEN 1 END)`,
        })
        .from(upworkOutreach)
        .where(baseConds.length > 0 ? and(...baseConds) : undefined);

      const m = metricRows[0];
      const total = m.total;
      const viewed = Number(m.viewed);
      const replied = Number(m.replied);
      const initialCallBooked = Number(m.initialCallBooked);
      const initialCallCompleted = Number(m.initialCallCompleted);
      const secondCallBooked = Number(m.secondCallBooked);
      const estimateSent = Number(m.estimateSent);
      const estimateWon = Number(m.estimateWon);

      const stageOrder = [
        "New",
        "First contact",
        "Negotiations",
        "Call Booked",
        "Estimating",
        "Estimate presentation",
        "Frozen / Later",
        "Contract Signed",
        "Lost (Client Reject)",
        "Dropped (Internal)",
      ];
      const orderedStages = stageRows.sort(
        (a, b) => stageOrder.indexOf(a.stage ?? "") - stageOrder.indexOf(b.stage ?? ""),
      );

      return {
        stageBreakdown: orderedStages,
        funnel: {
          total,
          viewed,
          replied,
          initialCallBooked,
          initialCallCompleted,
          secondCallBooked,
          estimateSent,
          estimateWon,
          viewRatePct: pct(viewed, total),
          replyRatePct: pct(replied, total),
          callBookingRatePct: pct(initialCallBooked, replied),
          estimateWinRatePct: pct(estimateWon, estimateSent),
        },
      };
    }),
  }),

  // ── 15. Upwork recent activity ──────────────────────────────────────────
  getUpworkRecentActivity: tool({
    description:
      "Show recent Upwork activity. Two modes: " +
      '(1) "replies" — latest bids or outreach that received replies, with job/client context. ' +
      '(2) "followups" — upcoming outreach follow-ups within the next N days. ' +
      'Source can be "bids" or "outreach".',
    inputSchema: zodSchema(
      z.object({
        mode: z
          .enum(["replies", "followups"])
          .describe('"replies" for recent replies, "followups" for upcoming follow-ups.'),
        source: z
          .enum(["bids", "outreach"])
          .default("bids")
          .describe('Data source: "bids" or "outreach". Defaults to "bids". Followups only available for outreach.'),
        limit: z.number().int().min(1).max(50).default(10).describe("Max records to return. Defaults to 10."),
        daysAhead: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("For followups mode: show follow-ups within this many days. Defaults to 7."),
      }),
    ),
    execute: withToolError(async ({ mode, source, limit, daysAhead }) => {
      if (mode === "replies" && source === "bids") {
        return db
          .select({
            uid: upworkBids.uid,
            jobTitle: upworkBids.jobTitle,
            profile: upworkBids.profile,
            clientCountry: upworkBids.clientCountry,
            totalSpent: upworkBids.totalSpent,
            bidStatus: upworkBids.bidStatus,
            replyDate: upworkBids.replyDate,
            proposalSent: upworkBids.proposalSent,
            connectsSpent: upworkBids.connectsSpent,
            boosted: upworkBids.boosted,
            interviews: upworkBids.interviews,
          })
          .from(upworkBids)
          .where(isNotNull(upworkBids.replyDate))
          .orderBy(desc(upworkBids.replyDate))
          .limit(limit);
      }

      if (mode === "replies" && source === "outreach") {
        return db
          .select({
            uid: upworkOutreach.uid,
            clientName: upworkOutreach.clientName,
            jobTitle: upworkOutreach.jobTitle,
            profile: upworkOutreach.profile,
            stage: upworkOutreach.stage,
            clientCountry: upworkOutreach.clientCountry,
            totalSpent: upworkOutreach.totalSpent,
            replyDate: upworkOutreach.replyDate,
            proposalSent: upworkOutreach.proposalSent,
            sourceData: upworkOutreach.sourceData,
            initialCallStatus: upworkOutreach.initialCallStatus,
          })
          .from(upworkOutreach)
          .where(isNotNull(upworkOutreach.replyDate))
          .orderBy(desc(upworkOutreach.replyDate))
          .limit(limit);
      }

      // mode === "followups" — only outreach has next_action_date
      // Bug 8 fix: toISOString() returns UTC which can be yesterday's date in
      // timezones ahead of UTC. Use local calendar date arithmetic instead.
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const future = new Date(now);
      future.setDate(future.getDate() + daysAhead);
      const futureStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;

      return db
        .select({
          uid: upworkOutreach.uid,
          clientName: upworkOutreach.clientName,
          jobTitle: upworkOutreach.jobTitle,
          profile: upworkOutreach.profile,
          stage: upworkOutreach.stage,
          currentFuStep: upworkOutreach.currentFuStep,
          nextActionDate: upworkOutreach.nextActionDate,
          lastContact: upworkOutreach.lastContact,
          clientCountry: upworkOutreach.clientCountry,
          totalSpent: upworkOutreach.totalSpent,
        })
        .from(upworkOutreach)
        .where(
          and(
            isNotNull(upworkOutreach.nextActionDate),
            gte(upworkOutreach.nextActionDate, todayStr),
            lte(upworkOutreach.nextActionDate, futureStr),
          ),
        )
        .orderBy(upworkOutreach.nextActionDate)
        .limit(limit);
    }),
  }),

  // ── 16a. Upwork bids time trend ─────────────────────────────────────────
  getUpworkBidsTrend: tool({
    description:
      "Weekly (or daily/monthly) time-series of Upwork bids: sent, viewed, replied. " +
      "Use this whenever the user asks about bid performance over time, trends, or weekly breakdowns. " +
      "Optionally filter by profile and date range.",
    inputSchema: zodSchema(
      z.object({
        granularity: z
          .enum(["day", "week", "month"])
          .default("week")
          .describe('Time bucket size: "day", "week", or "month". Defaults to "week".'),
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ granularity, profile, startDate, endDate }) => {
      // Bug 5/6 fix: DATE_TRUNC requires its first argument to be a quoted string
      // literal, not a bind parameter. granularity is Zod-enum-validated so
      // sql.raw() is safe. The granularity is wrapped in single quotes so Postgres
      // receives  DATE_TRUNC('week', ...)  rather than  DATE_TRUNC(week, ...).

      const conditions = [
        isNotNull(upworkBids.proposalSent),
        ...timestampDateRange(upworkBids.proposalSent, startDate, endDate),
      ];
      if (profile) conditions.push(eq(upworkBids.profile, profile));

      // Re-declare the period expression as a stable sql fragment so that
      // Drizzle uses the same literal in SELECT, GROUP BY, and ORDER BY
      // without re-parameterizing or re-expanding the template.
      const periodExpr = sql<Date>`DATE_TRUNC('${sql.raw(granularity)}', ${upworkBids.proposalSent})`;

      const rows = await db
        .select({
          period: periodExpr,
          sent: count(),
          viewed: sql<number>`COUNT(CASE WHEN ${upworkBids.viewStatus} = 'Viewed' THEN 1 END)`,
          replied: sql<number>`COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)`,
          viewPct: sql<number>`ROUND(
            COUNT(CASE WHEN ${upworkBids.viewStatus} = 'Viewed' THEN 1 END)::numeric
            / NULLIF(COUNT(*), 0) * 100, 1)`,
          replyPct: sql<number>`ROUND(
            COUNT(CASE WHEN ${upworkBids.replyStatus} = 'Replied' THEN 1 END)::numeric
            / NULLIF(COUNT(*), 0) * 100, 1)`,
        })
        .from(upworkBids)
        .where(and(...conditions))
        .groupBy(sql`DATE_TRUNC('${sql.raw(granularity)}', ${upworkBids.proposalSent})`)
        .orderBy(sql`DATE_TRUNC('${sql.raw(granularity)}', ${upworkBids.proposalSent})`);

      return rows.map((r) => ({
        period: r.period instanceof Date ? r.period.toISOString().slice(0, 10) : String(r.period).slice(0, 10),
        sent: r.sent,
        viewed: Number(r.viewed),
        replied: Number(r.replied),
        viewPct: Number(r.viewPct),
        replyPct: Number(r.replyPct),
      }));
    }),
  }),

  // ── 17. Lost reason breakdown ───────────────────────────────────────────
  getLostReasonBreakdown: tool({
    description:
      "Aggregate why Upwork outreach deals are lost. Groups deals by lost_reason and returns, per reason: " +
      "deal count, share of all lost deals, and the total/average estimate_amount of those deals " +
      "(the dollar value that walked away). Only deals with a non-null lost_reason are included. " +
      "Use this to understand the dominant causes of lost deals. " +
      "Optionally filter by profile or by date range on proposal_sent.",
    inputSchema: zodSchema(
      z.object({
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ profile, startDate, endDate }) => {
      const conditions = [
        isNotNull(upworkOutreach.lostReason),
        ...timestampDateRange(upworkOutreach.proposalSent, startDate, endDate),
      ];
      if (profile) conditions.push(eq(upworkOutreach.profile, profile));

      const rows = await db
        .select({
          lostReason: upworkOutreach.lostReason,
          deals: count(),
          totalEstimateValue: sql<number>`COALESCE(SUM(${upworkOutreach.estimateAmount}), 0)`,
          avgEstimateAmount: sql<number>`ROUND(AVG(${upworkOutreach.estimateAmount})::numeric, 0)`,
        })
        .from(upworkOutreach)
        .where(and(...conditions))
        .groupBy(upworkOutreach.lostReason)
        .orderBy(desc(count()));

      const totalLost = rows.reduce((sum, r) => sum + r.deals, 0);

      return rows.map((r) => ({
        lostReason: r.lostReason,
        deals: r.deals,
        pctOfLost: pct(r.deals, totalLost),
        totalEstimateValue: Number(r.totalEstimateValue),
        avgEstimateAmount: Number(r.avgEstimateAmount) || 0,
      }));
    }),
  }),

  // ── 18. Upwork pipeline value ───────────────────────────────────────────
  getUpworkPipelineValue: tool({
    description:
      "Dollar-value analysis of the Upwork outreach pipeline, based on estimate_amount. Returns: " +
      "(1) summary — deals with an estimate, total estimate value, won deals, won value, estimate win rate; " +
      "(2) byStage — estimate value and deal count grouped by pipeline stage; " +
      "(3) byDealSizeBand — deal count, won count, win rate, and total value per estimate-size band. " +
      "Only deals with a non-null estimate_amount are included. Optionally filter by profile or date range.",
    inputSchema: zodSchema(
      z.object({
        profile: z.string().optional().describe("Filter by Upwork profile name."),
        startDate: z.string().optional().describe("Start date filter on proposal_sent (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on proposal_sent (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ profile, startDate, endDate }) => {
      const conditions = [
        isNotNull(upworkOutreach.estimateAmount),
        ...timestampDateRange(upworkOutreach.proposalSent, startDate, endDate),
      ];
      if (profile) conditions.push(eq(upworkOutreach.profile, profile));

      const bandExpr = sql<string>`
        CASE
          WHEN ${upworkOutreach.estimateAmount} < 5000  THEN '< $5k'
          WHEN ${upworkOutreach.estimateAmount} < 15000 THEN '$5k-15k'
          WHEN ${upworkOutreach.estimateAmount} < 30000 THEN '$15k-30k'
          WHEN ${upworkOutreach.estimateAmount} < 50000 THEN '$30k-50k'
          ELSE '$50k+'
        END
      `;
      const wonExpr = sql<number>`COUNT(CASE WHEN ${upworkOutreach.estimateResult} = 'Successful' THEN 1 END)`;

      const summaryRows = await db
        .select({
          dealsWithEstimate: count(),
          totalEstimateValue: sql<number>`COALESCE(SUM(${upworkOutreach.estimateAmount}), 0)`,
          wonDeals: wonExpr,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${upworkOutreach.estimateResult} = 'Successful' THEN ${upworkOutreach.estimateAmount} END), 0)`,
        })
        .from(upworkOutreach)
        .where(and(...conditions));

      const byStage = await db
        .select({
          stage: upworkOutreach.stage,
          deals: count(),
          totalEstimateValue: sql<number>`COALESCE(SUM(${upworkOutreach.estimateAmount}), 0)`,
          avgEstimateAmount: sql<number>`ROUND(AVG(${upworkOutreach.estimateAmount})::numeric, 0)`,
        })
        .from(upworkOutreach)
        .where(and(...conditions))
        .groupBy(upworkOutreach.stage)
        .orderBy(desc(sql`SUM(${upworkOutreach.estimateAmount})`));

      const byBand = await db
        .select({
          band: bandExpr,
          deals: count(),
          won: wonExpr,
          totalEstimateValue: sql<number>`COALESCE(SUM(${upworkOutreach.estimateAmount}), 0)`,
        })
        .from(upworkOutreach)
        .where(and(...conditions))
        .groupBy(bandExpr);

      const s = summaryRows[0] ?? { dealsWithEstimate: 0, totalEstimateValue: 0, wonDeals: 0, wonValue: 0 };
      const bandOrder = ["< $5k", "$5k-15k", "$15k-30k", "$30k-50k", "$50k+"];

      return {
        summary: {
          dealsWithEstimate: s.dealsWithEstimate,
          totalEstimateValue: Number(s.totalEstimateValue),
          wonDeals: Number(s.wonDeals),
          wonValue: Number(s.wonValue),
          estimateWinRatePct: pct(Number(s.wonDeals), s.dealsWithEstimate),
        },
        byStage: byStage.map((r) => ({
          stage: r.stage,
          deals: r.deals,
          totalEstimateValue: Number(r.totalEstimateValue),
          avgEstimateAmount: Number(r.avgEstimateAmount) || 0,
        })),
        byDealSizeBand: byBand
          .map((r) => ({
            band: r.band,
            deals: r.deals,
            won: Number(r.won),
            winRatePct: pct(Number(r.won), r.deals),
            totalEstimateValue: Number(r.totalEstimateValue),
          }))
          .sort((a, b) => bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band)),
      };
    }),
  }),
};
