import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { campaigns, companies, contacts, outreach } from '@/db/schema'

export const tools = {
  // ── 1. Campaign funnel ───────────────────────────────────────────────────
  getCampaignFunnel: tool({
    description:
      'Aggregate outreach counts grouped by stage and lead_status. ' +
      'Optionally filter by campaign name to see funnel metrics for a specific campaign.',
    inputSchema: zodSchema(
      z.object({
        campaignName: z
          .string()
          .optional()
          .describe('Filter by exact campaign name. Omit to aggregate across all campaigns.'),
      }),
    ),
    execute: async ({ campaignName }) => {
      const rows = await db
        .select({
          stage: outreach.stage,
          leadStatus: outreach.leadStatus,
          count: count(),
        })
        .from(outreach)
        .leftJoin(campaigns, eq(outreach.campaignId, campaigns.id))
        .where(campaignName ? eq(campaigns.name, campaignName) : undefined)
        .groupBy(outreach.stage, outreach.leadStatus)
        .orderBy(outreach.stage, outreach.leadStatus)

      return rows
    },
  }),

  // ── 2. Hook A/B performance ──────────────────────────────────────────────
  compareHookPerformance: tool({
    description:
      'Compare reply rates between AI-generated and manually-edited hook personalizations. ' +
      'Returns total contacts and replied count for AI vs manual hook variants.',
    inputSchema: zodSchema(
      z.object({
        hookNumber: z
          .number()
          .int()
          .min(1)
          .max(2)
          .default(1)
          .describe('Which hook slot to compare: 1 or 2. Defaults to 1.'),
      }),
    ),
    execute: async ({ hookNumber }) => {
      const aiField = hookNumber === 1 ? contacts.hook1Ai : contacts.hook2Ai
      const manualField = hookNumber === 1 ? contacts.hook1Manual : contacts.hook2Manual

      const hookTypeExpr = sql<string>`CASE WHEN ${manualField} IS NOT NULL THEN 'manual' ELSE 'ai' END`

      const rows = await db
        .select({
          hookType: hookTypeExpr,
          total: count(),
          replied: sql<number>`COUNT(${outreach.repliedDate})`,
        })
        .from(contacts)
        .leftJoin(outreach, eq(outreach.contactId, contacts.id))
        .where(sql`${aiField} IS NOT NULL OR ${manualField} IS NOT NULL`)
        .groupBy(hookTypeExpr)

      return rows.map((r) => ({
        hookType: r.hookType,
        total: r.total,
        replied: Number(r.replied),
        replyRatePct: r.total > 0 ? +((Number(r.replied) / r.total) * 100).toFixed(1) : 0,
      }))
    },
  }),

  // ── 3. Recent replies ────────────────────────────────────────────────────
  getRecentResponses: tool({
    description:
      'Fetch the most recent outreach replies joined with contact and company data. ' +
      'Optionally filter by industry or response category (e.g. "Interested", "Later", "Soft No").',
    inputSchema: zodSchema(
      z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe('Number of records to return. Defaults to 10.'),
        industry: z
          .string()
          .optional()
          .describe('Case-insensitive partial match on company industry.'),
        responseCategory: z
          .string()
          .optional()
          .describe(
            'Filter by response category. Valid values: "Interested", "Later", "Soft No", "Hard No", "Technical".',
          ),
      }),
    ),
    execute: async ({ limit, industry, responseCategory }) => {
      const conditions = [isNotNull(outreach.repliedDate)]
      if (responseCategory) conditions.push(eq(outreach.responseCategory, responseCategory))
      if (industry)
        conditions.push(
          sql`LOWER(${companies.industry}) LIKE ${'%' + industry.toLowerCase() + '%'}`,
        )

      const rows = await db
        .select({
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
        .limit(limit)

      return rows
    },
  }),
}
