import { tool, zodSchema } from "ai";
import { z } from "zod";
import { and, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, companies, contacts, outreach } from "@/db/schema";
import { stringDateRange } from "./shared/conditions";
import { pct, repliedCountExpr, repliedRateExpr } from "./shared/metrics";
import { withToolError } from "./shared/withToolError";

export const linkedinTools = {
  // ── 1. Campaign funnel ──────────────────────────────────────────────────
  getCampaignFunnel: tool({
    description:
      "Aggregate outreach counts grouped by outreach_status (Waiting, Active, Connected, Replied). " +
      "Replied is calculated as outreach_status IN (Replied, Continued, Stopped). " +
      "Optionally filter by campaign name to see funnel metrics for a specific campaign.",
    inputSchema: zodSchema(
      z.object({
        campaignName: z
          .string()
          .optional()
          .describe("Filter by exact campaign name. Omit to aggregate across all campaigns."),
      }),
    ),
    execute: withToolError(async ({ campaignName }) => {
      const funnelStatus = sql<string>`
        CASE WHEN ${outreach.outreachStatus} IN ('Replied', 'Continued', 'Stopped')
             THEN 'Replied'
             ELSE ${outreach.outreachStatus}
        END
      `;

      const conditions = [];
      if (campaignName) conditions.push(eq(campaigns.name, campaignName));

      const rows = await db
        .select({ status: funnelStatus, count: count() })
        .from(outreach)
        .leftJoin(contacts, eq(outreach.contactId, contacts.id))
        .leftJoin(campaigns, eq(contacts.campaignId, campaigns.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(funnelStatus);

      const order = ["Waiting", "Active", "Connected", "Replied"];
      // Bug 10 fix: unknown statuses get index -1 which sorts them to the top;
      // map -1 to Infinity so they fall to the bottom instead.
      return rows.sort((a, b) => {
        const ai = order.indexOf(a.status ?? "");
        const bi = order.indexOf(b.status ?? "");
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      });
    }),
  }),

  // ── 2. Hook A/B performance ─────────────────────────────────────────────
  compareHookPerformance: tool({
    description:
      "Compare reply rates between AI-generated and manually-edited hook personalizations. " +
      "Returns total contacts and replied count for AI vs manual hook variants.",
    inputSchema: zodSchema(
      z.object({
        hookNumber: z
          .number()
          .int()
          .min(1)
          .max(5)
          .default(1)
          .describe("Which hook slot to compare: 1 through 5. Defaults to 1."),
      }),
    ),
    execute: withToolError(async ({ hookNumber }) => {
      const aiFields = {
        1: contacts.hook1Ai,
        2: contacts.hook2Ai,
        3: contacts.hook3Ai,
        4: contacts.hook4Ai,
        5: contacts.hook5Ai,
      } as const;
      const manualFields = {
        1: contacts.hook1Manual,
        2: contacts.hook2Manual,
        3: contacts.hook3Manual,
        4: contacts.hook4Manual,
        5: contacts.hook5Manual,
      } as const;

      const aiField = aiFields[hookNumber as keyof typeof aiFields];
      const manualField = manualFields[hookNumber as keyof typeof manualFields];
      const hookTypeExpr = sql<string>`CASE WHEN ${manualField} IS NOT NULL THEN 'manual' ELSE 'ai' END`;

      // Bug 1 fix: original query mixed cardinalities — COUNT(*) on contacts rows
      // but COUNT(outreach.repliedDate) on the joined outreach rows, inflating
      // totals when a contact has multiple outreach records. Fix: aggregate at the
      // outreach level using COUNT DISTINCT contacts for total, and count distinct
      // replied contacts for the replied metric.
      const rows = await db
        .select({
          hookType: hookTypeExpr,
          total: sql<number>`COUNT(DISTINCT ${contacts.id})`,
          replied: sql<number>`COUNT(DISTINCT CASE WHEN ${outreach.repliedDate} IS NOT NULL THEN ${contacts.id} END)`,
        })
        .from(contacts)
        .leftJoin(outreach, eq(outreach.contactId, contacts.id))
        .where(sql`${aiField} IS NOT NULL OR ${manualField} IS NOT NULL`)
        .groupBy(hookTypeExpr);

      return rows.map((r) => ({
        hookType: r.hookType,
        total: Number(r.total),
        replied: Number(r.replied),
        replyRatePct: pct(Number(r.replied), Number(r.total)),
      }));
    }),
  }),

  // ── 3. Recent replies ───────────────────────────────────────────────────
  getRecentResponses: tool({
    description:
      "Fetch the most recent outreach replies joined with contact and company data. " +
      'Optionally filter by industry or response category (e.g. "Interested", "Later", "Soft No").',
    inputSchema: zodSchema(
      z.object({
        limit: z.number().int().min(1).max(50).default(10).describe("Number of records to return. Defaults to 10."),
        industry: z.string().optional().describe("Case-insensitive partial match on company industry."),
        responseCategory: z
          .string()
          .optional()
          .describe(
            'Filter by response category. Valid values: "Interested", "Later", "Soft No", "Hard No", "Technical".',
          ),
      }),
    ),
    execute: withToolError(async ({ limit, industry, responseCategory }) => {
      const conditions = [isNotNull(outreach.repliedDate)];
      if (responseCategory) conditions.push(eq(outreach.responseCategory, responseCategory));
      if (industry) conditions.push(sql`LOWER(${companies.industry}) LIKE ${"%" + industry.toLowerCase() + "%"}`);

      return db
        .select({
          airtableId: outreach.airtableId,
          repliedDate: outreach.repliedDate,
          responseCategory: outreach.responseCategory,
          whichMessageReplied: outreach.whichMessageReplied,
          stage: outreach.stage,
          contactName: contacts.fullName,
          contactTitle: contacts.title,
          companyName: companies.companyName,
          industry: companies.industry,
          hqCountry: companies.hqCountry,
        })
        .from(outreach)
        .innerJoin(contacts, eq(outreach.contactId, contacts.id))
        .innerJoin(companies, eq(contacts.companyId, companies.id))
        .where(and(...conditions))
        .orderBy(desc(outreach.repliedDate))
        .limit(limit);
    }),
  }),

  // ── 4. Compare campaigns ────────────────────────────────────────────────
  compareCampaigns: tool({
    description:
      "Rank campaigns by connection rate and reply rate. " +
      "Returns campaign name, status, total contacts, connected count, replied count, connect %, reply %. " +
      'Optionally filter by campaign status (e.g. "Running", "Stopped", "Draft").',
    inputSchema: zodSchema(
      z.object({
        status: z
          .string()
          .optional()
          .describe('Filter by campaign status. Valid values: "Draft", "Running", "Stopped". Omit for all.'),
      }),
    ),
    execute: withToolError(async ({ status }) => {
      const conditions = [];
      if (status) conditions.push(eq(campaigns.status, status));

      const rows = await db
        .select({
          campaignName: campaigns.name,
          campaignStatus: campaigns.status,
          total: count(),
          connected: sql<number>`COUNT(${outreach.connectedDate})`,
          replied: repliedCountExpr(outreach.outreachStatus),
        })
        .from(outreach)
        .innerJoin(contacts, eq(outreach.contactId, contacts.id))
        .innerJoin(campaigns, eq(contacts.campaignId, campaigns.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(campaigns.name, campaigns.status)
        .orderBy(desc(repliedRateExpr(outreach.outreachStatus)));

      return rows.map((r) => ({
        campaignName: r.campaignName,
        status: r.campaignStatus,
        total: r.total,
        connected: Number(r.connected),
        replied: Number(r.replied),
        connectPct: pct(Number(r.connected), r.total),
        replyPct: pct(Number(r.replied), r.total),
      }));
    }),
  }),

  // ── 5. Response breakdown ───────────────────────────────────────────────
  getResponseBreakdown: tool({
    description:
      "Aggregate reply response categories (Interested, Later, Soft No, Hard No, Technical) and sub-categories. " +
      "Shows count and percentage of total replies. " +
      "Optionally filter by campaign name, industry, or date range.",
    inputSchema: zodSchema(
      z.object({
        campaignName: z.string().optional().describe("Filter by exact campaign name."),
        industry: z.string().optional().describe("Case-insensitive partial match on company industry."),
        startDate: z.string().optional().describe("Start date filter on replied_date (YYYY-MM-DD inclusive)."),
        endDate: z.string().optional().describe("End date filter on replied_date (YYYY-MM-DD inclusive)."),
      }),
    ),
    execute: withToolError(async ({ campaignName, industry, startDate, endDate }) => {
      const conditions = [
        isNotNull(outreach.responseCategory),
        ...stringDateRange(outreach.repliedDate, startDate, endDate),
      ];
      if (campaignName) conditions.push(eq(campaigns.name, campaignName));
      if (industry) conditions.push(sql`LOWER(${companies.industry}) LIKE ${"% " + industry.toLowerCase() + "% "}`);

      // Bug 2 fix: using leftJoin for companies combined with a WHERE filter on
      // companies.industry silently dropped rows where outreach.companyId is null
      // (the LEFT JOIN produces NULLs, then the WHERE eliminates them). Use
      // innerJoin on companies only when an industry filter is active so those rows
      // are properly required; otherwise use leftJoin so unlinked outreach rows are
      // still counted.
      const baseQuery = db
        .select({
          category: outreach.responseCategory,
          subcategory: outreach.responseSubcategory,
          count: count(),
        })
        .from(outreach)
        .innerJoin(contacts, eq(outreach.contactId, contacts.id))
        .leftJoin(campaigns, eq(contacts.campaignId, campaigns.id))
        .$dynamic();

      const withCompanies = industry
        ? baseQuery.innerJoin(companies, eq(outreach.companyId, companies.id))
        : baseQuery.leftJoin(companies, eq(outreach.companyId, companies.id));

      const rows = await withCompanies
        .where(and(...conditions))
        .groupBy(outreach.responseCategory, outreach.responseSubcategory)
        .orderBy(desc(count()));

      const total = rows.reduce((sum, r) => sum + r.count, 0);

      return rows.map((r) => ({
        category: r.category,
        subcategory: r.subcategory,
        count: r.count,
        pctOfTotal: pct(r.count, total),
      }));
    }),
  }),

  // ── 6. Message sequence effectiveness ──────────────────────────────────
  getMessageSequenceEffectiveness: tool({
    description:
      "Show which message in the outreach sequence generates the most replies. " +
      "Groups replied outreach by which_message_replied (CR, 1st, 2nd, 3rd). " +
      "Returns message number, reply count, and share %. Optionally filter by campaign.",
    inputSchema: zodSchema(
      z.object({
        campaignName: z.string().optional().describe("Filter by exact campaign name."),
      }),
    ),
    execute: withToolError(async ({ campaignName }) => {
      const conditions = [isNotNull(outreach.whichMessageReplied)];
      if (campaignName) conditions.push(eq(campaigns.name, campaignName));

      const rows = await db
        .select({
          messageNumber: outreach.whichMessageReplied,
          replyCount: count(),
        })
        .from(outreach)
        .innerJoin(contacts, eq(outreach.contactId, contacts.id))
        .leftJoin(campaigns, eq(contacts.campaignId, campaigns.id))
        .where(and(...conditions))
        .groupBy(outreach.whichMessageReplied)
        .orderBy(desc(count()));

      const total = rows.reduce((sum, r) => sum + r.replyCount, 0);
      const order = ["CR", "1st", "2nd", "3rd"];

      return rows
        .map((r) => ({
          messageNumber: r.messageNumber,
          replyCount: r.replyCount,
          sharePct: pct(r.replyCount, total),
        }))
        .sort((a, b) => order.indexOf(a.messageNumber ?? "") - order.indexOf(b.messageNumber ?? ""));
    }),
  }),

  // ── 7. Outreach timeline ────────────────────────────────────────────────
  // Rewrote from sql.raw() + manual string-escaping to a parameterised sql``
  // template. Drizzle binds all interpolated values, eliminating injection risk.
  getOutreachTimeline: tool({
    description:
      "Time-series view of connections and replies bucketed by day, week, or month. " +
      "Shows how outreach metrics trend over time. " +
      "Optionally filter by date range and/or campaign name.",
    inputSchema: zodSchema(
      z.object({
        granularity: z
          .enum(["day", "week", "month"])
          .default("week")
          .describe('Time bucket size: "day", "week", or "month". Defaults to "week".'),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD inclusive). Defaults to all time."),
        endDate: z.string().optional().describe("End date (YYYY-MM-DD inclusive). Defaults to today."),
        campaignName: z.string().optional().describe("Filter by exact campaign name."),
      }),
    ),
    execute: withToolError(async ({ granularity, startDate, endDate, campaignName }) => {
      const rows = await db.execute(sql`
        WITH events AS (
          SELECT ${outreach.connectedDate}::date AS event_date,
                 'connection'::text              AS event_type,
                 ${outreach.contactId}           AS contact_id
          FROM   ${outreach}
          WHERE  ${outreach.connectedDate} IS NOT NULL

          UNION ALL

          SELECT ${outreach.repliedDate}::date AS event_date,
                 'reply'::text                 AS event_type,
                 ${outreach.contactId}         AS contact_id
          FROM   ${outreach}
          WHERE  ${outreach.repliedDate} IS NOT NULL
        )
        SELECT
          DATE_TRUNC(${sql.raw(granularity)}, d.event_date)                           AS period,
          SUM(CASE WHEN d.event_type = 'connection' THEN 1 ELSE 0 END)::int AS connections,
          SUM(CASE WHEN d.event_type = 'reply'      THEN 1 ELSE 0 END)::int AS replies
        FROM   events d
        INNER JOIN ${contacts}  c   ON c.id = d.contact_id
        LEFT  JOIN ${campaigns} cam ON cam.id = c.campaign_id
        WHERE  1 = 1
        ${campaignName ? sql`AND cam.name = ${campaignName}` : sql``}
        ${startDate ? sql`AND d.event_date >= ${startDate}::date` : sql``}
        ${endDate ? sql`AND d.event_date <= ${endDate}::date` : sql``}
        GROUP BY DATE_TRUNC(${sql.raw(granularity)}, d.event_date)
        ORDER BY period
      `);

      return (rows as Array<Record<string, unknown>>).map((r) => ({
        period: r.period,
        connections: Number(r.connections),
        replies: Number(r.replies),
      }));
    }),
  }),

  // ── 8. Industry performance ─────────────────────────────────────────────
  getIndustryPerformance: tool({
    description:
      "Show outreach performance grouped by company industry or AI-generated niche. " +
      "Returns total outreach, connected count, replied count, connect %, reply % per dimension value. " +
      "Optionally set a minimum sample size to filter out noise.",
    inputSchema: zodSchema(
      z.object({
        dimension: z
          .enum(["industry", "aiNiche"])
          .default("industry")
          .describe('Group by "industry" or "aiNiche". Defaults to "industry".'),
        minSampleSize: z
          .number()
          .int()
          .min(1)
          .default(5)
          .describe("Minimum outreach count to include a group. Defaults to 5."),
      }),
    ),
    execute: withToolError(async ({ dimension, minSampleSize }) => {
      const dimColumn = dimension === "aiNiche" ? companies.aiNiche : companies.industry;

      const rows = await db
        .select({
          dimension: dimColumn,
          total: count(),
          connected: sql<number>`COUNT(${outreach.connectedDate})`,
          replied: repliedCountExpr(outreach.outreachStatus),
        })
        .from(outreach)
        .innerJoin(companies, eq(outreach.companyId, companies.id))
        .where(isNotNull(dimColumn))
        .groupBy(dimColumn)
        .having(gte(count(), minSampleSize))
        .orderBy(desc(repliedRateExpr(outreach.outreachStatus)));

      return rows.map((r) => ({
        [dimension]: r.dimension,
        total: r.total,
        connected: Number(r.connected),
        replied: Number(r.replied),
        connectPct: pct(Number(r.connected), r.total),
        replyPct: pct(Number(r.replied), r.total),
      }));
    }),
  }),

  // ── 9. Geography performance ────────────────────────────────────────────
  // Fixed: original attempted to conditionally chain .innerJoin() onto an already
  // assigned query builder, which is a no-op in Drizzle (each chain returns a new
  // object). Now always joins contacts + campaigns via leftJoin so the campaign
  // filter in WHERE works correctly without dropping unfiltered rows.
  getGeographyPerformance: tool({
    description:
      "Show outreach performance grouped by company HQ country. " +
      "Returns country, total outreach, connected, replied, connect %, reply %. " +
      "Optionally filter by campaign and limit to top N countries.",
    inputSchema: zodSchema(
      z.object({
        topN: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("Return only the top N countries by total outreach. Defaults to 20."),
        campaignName: z.string().optional().describe("Filter by exact campaign name."),
      }),
    ),
    execute: withToolError(async ({ topN, campaignName }) => {
      const conditions = [isNotNull(companies.hqCountry)];
      if (campaignName) conditions.push(eq(campaigns.name, campaignName));

      const rows = await db
        .select({
          country: companies.hqCountry,
          total: count(),
          connected: sql<number>`COUNT(${outreach.connectedDate})`,
          replied: repliedCountExpr(outreach.outreachStatus),
        })
        .from(outreach)
        .innerJoin(companies, eq(outreach.companyId, companies.id))
        .leftJoin(contacts, eq(outreach.contactId, contacts.id))
        .leftJoin(campaigns, eq(contacts.campaignId, campaigns.id))
        .where(and(...conditions))
        .groupBy(companies.hqCountry)
        .orderBy(desc(count()))
        .limit(topN);

      return rows.map((r) => ({
        country: r.country,
        total: r.total,
        connected: Number(r.connected),
        replied: Number(r.replied),
        connectPct: pct(Number(r.connected), r.total),
        replyPct: pct(Number(r.replied), r.total),
      }));
    }),
  }),

  // ── 10. Lead pipeline ───────────────────────────────────────────────────
  getLeadPipeline: tool({
    description:
      "View the lead pipeline. Two modes: " +
      '(1) "summary" — counts of leads grouped by lead_status and/or stage. ' +
      '(2) "overdue" — leads whose next_action_date is before today, with contact & company context. ' +
      "Use summary to understand pipeline shape; use overdue to find follow-ups that need attention.",
    inputSchema: zodSchema(
      z.object({
        mode: z
          .enum(["summary", "overdue"])
          .describe('"summary" for pipeline counts, "overdue" for overdue follow-ups.'),
        stageFilter: z
          .string()
          .optional()
          .describe(
            'Filter by stage. Valid values: "New", "First contact", "Negotiations", "Call", "Lost (Client Reject)", "Dropped (Internal)".',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(25)
          .describe("Max records to return in overdue mode. Defaults to 25."),
      }),
    ),
    execute: withToolError(async ({ mode, stageFilter, limit }) => {
      if (mode === "summary") {
        const conditions = [];
        if (stageFilter) conditions.push(eq(outreach.stage, stageFilter));

        return db
          .select({
            stage: outreach.stage,
            leadStatus: outreach.leadStatus,
            count: count(),
          })
          .from(outreach)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .groupBy(outreach.stage, outreach.leadStatus)
          .orderBy(outreach.stage, outreach.leadStatus);
      }

      // mode === "overdue"
      const today = new Date().toISOString().split("T")[0];
      const conditions = [lt(outreach.nextActionDate, today)];
      if (stageFilter) conditions.push(eq(outreach.stage, stageFilter));

      return db
        .select({
          contactName: outreach.fullName,
          title: outreach.title,
          companyName: companies.companyName,
          industry: companies.industry,
          stage: outreach.stage,
          leadStatus: outreach.leadStatus,
          nextActionDate: outreach.nextActionDate,
          currentFuStep: outreach.currentFuStep,
          lastTouchDate: outreach.lastTouchDate,
          outreachStatus: outreach.outreachStatus,
        })
        .from(outreach)
        .leftJoin(companies, eq(outreach.companyId, companies.id))
        .where(and(...conditions))
        .orderBy(outreach.nextActionDate)
        .limit(limit);
    }),
  }),
};
