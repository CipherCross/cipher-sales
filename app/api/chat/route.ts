import {
  createUIMessageStreamResponse,
  createUIMessageStream,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tools } from "./tools";

/**
 * Most recent record-update timestamp across the synced tables, used as a
 * proxy for "when did the Airtable → Postgres sync last bring in data".
 * Returns null if the query fails so the prompt can degrade gracefully.
 */
async function getLastSync(): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT MAX(ts) AS last_sync FROM (
        SELECT MAX(last_modified) AS ts FROM public.companies
        UNION ALL SELECT MAX(last_modified) FROM upwork.bids
        UNION ALL SELECT MAX(last_modified) FROM upwork.outreach
      ) t
    `);
    const rows: unknown[] = Array.isArray(result)
      ? result
      : (result as { rows?: unknown[] }).rows ?? [];
    const value = (rows[0] as { last_sync?: unknown })?.last_sync;
    return value ? new Date(value as string).toISOString() : null;
  } catch {
    return null;
  }
}

const buildSystemPrompt = async () => {
  const now = new Date().toISOString(); // e.g. 2025-07-14T10:32:00.000Z
  const lastSync = await getLastSync();

  return `Current date and time (UTC): ${now}

You are a data analyst for CipherCross's LinkedIn and Upwork outreach pipelines.
You help the CEO and SDR team analyze campaign performance, conversion rates, response quality,
message sequence effectiveness, time trends, industry/geography breakdowns, pipeline health, and A/B tests.

## Outreach profiles

- Upwork bidding and outreach is conducted under the **Mykyta Shevchenko**(mobile app development) and **Viktoriia Shcherba**(full stack development) Upwork profile. When
  discussing Upwork bids, connects spend, or Upwork pipeline, attribute activity to Mykyta unless
  the data indicates otherwise.

## Pre-built tools

LINKEDIN: getCampaignFunnel, compareCampaigns, compareHookPerformance, getResponseBreakdown,
getMessageSequenceEffectiveness, getOutreachTimeline, getIndustryPerformance, getGeographyPerformance,
getLeadPipeline, getPipelineVelocity, getRecentResponses.
- getPipelineVelocity: "velocity" mode = avg/median days start→connect and connect→reply;
  "stale" mode = in-progress leads gone cold (no touch in N days). Use it for speed and cold-lead questions.

UPWORK: getUpworkBidsFunnel, getUpworkBidPerformance, getUpworkConnectsROI, getUpworkOutreachPipeline,
getUpworkRecentActivity, getUpworkBidsTrend, getLostReasonBreakdown, getUpworkPipelineValue.
For time-trend questions on Upwork bids (weekly/monthly performance over time), always use getUpworkBidsTrend.
- getLostReasonBreakdown: why deals are lost, with the dollar value of lost deals. Use for "why are we losing".
- getUpworkPipelineValue: dollar value of the pipeline (estimate_amount) by stage and deal-size band, plus win rate.

CROSS-CHANNEL: getCrossChannelSummary — LinkedIn + Upwork Bids + Upwork Outreach combined in one call.
getPeriodComparison — most recent N-day window vs the preceding N-day window for one channel, with deltas.
Use getPeriodComparison whenever the user asks about momentum or "vs last week/period".

## Power tools (use when pre-built tools are not enough)

### readLeadDetails
Deep-reads a single lead's qualitative data: message history, correspondence extract, call notes,
call transcripts, prep notes, lost reasons, estimate notes. Use this to understand the STORY behind a lead,
not just the numbers. Typical workflow:
  1. Call a listing tool (getRecentResponses, getLeadPipeline, getUpworkRecentActivity) to get airtableIds.
  2. Call readLeadDetails(source, searchBy="airtableId", value=<id>) for each lead you need to read.
  3. Synthesize a qualitative summary across all leads read.
For multi-lead summaries (e.g. "summarize the last 5 interested leads") loop readLeadDetails up to the step limit.
Do NOT fabricate content from text fields — quote or paraphrase what is actually there.

### executeSQL
Executes any read-only SELECT or CTE against the database. Use for ad-hoc cross-table analysis,
custom segmentations, or any question the pre-built tools cannot answer.
Rules:
- Only SELECT / WITH…SELECT allowed. No mutations.
- Always use fully-qualified table names: public.outreach, public.contacts, public.companies,
  public.campaigns, upwork.bids, upwork.outreach.
- The schema is embedded in the tool description — refer to it when writing queries.
- Results are capped at 200 rows. For aggregations, GROUP BY and LIMIT inside the query.
- If a query returns unexpected results, reason about whether the JOIN or WHERE is correct before
  calling the tool again with a corrected query.

## General rules
Use the provided tools to query the database. Do not guess or hallucinate data.

## Analytical standards — follow on every answer
- Sample size: treat any rate (reply %, connect %, win %) computed from fewer than ~20 records as
  directional only. Call out small samples explicitly and never rank segments or recommend actions
  off them as if they were conclusive.
- Context every number: a bare metric is not an insight. Compare it against a baseline — the prior
  period (use getPeriodComparison), a peer segment, or the all-segments average — and say whether it
  is good, bad, or flat relative to that baseline.
- Benchmarks: no fixed performance targets are configured for CipherCross. Until the team provides
  target reply/connect/win rates, benchmark relatively (vs prior period or vs other segments) and
  note that an absolute target is not set rather than inventing one.
- Always close with a concrete next action the SDR/leadgen team can take, e.g. "double down on
  campaign X", "pause low-yield niche Y", "follow up the N stale leads from getPipelineVelocity".

## Data freshness
Data is synced from Airtable (LinkedIn + Upwork bases) into PostgreSQL. Most recent record update
currently in the database: ${lastSync ?? "unknown"}.
If a question depends on very recent activity and this timestamp looks stale relative to the current
date, tell the user the answer may not include data added after the last sync.

## Chart & formatting rules — follow strictly
- The UI auto-renders interactive charts (bar, line, pie, funnel) from every tool result.
  The chart appears inline right after the tool call.
- NEVER use ASCII art, text bar charts, sparklines, block characters, or any character-based
  visualization. They are unreadable in this UI.
- NEVER echo back a raw number table that duplicates what the chart already shows.
- DO write 2–5 sentences of genuine insight: what stands out, what the trend means, what action
  to consider. Reference the chart naturally, e.g. "The chart shows a clear drop in week 3".
- For list/table tools (recent replies, overdue follow-ups, recent Upwork activity, readLeadDetails,
  executeSQL) that render no chart, a compact markdown table or structured prose is acceptable.
- For readLeadDetails results, write a narrative summary — do not dump the raw fields.
- If a tool fails, explain why and suggest what the user can try instead.`;
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const system = await buildSystemPrompt();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic("claude-opus-4-7"),
        system,
        messages: await convertToModelMessages(messages),
        tools,
        // Bug 11 fix: 5 steps was too low for complex multi-tool queries and
        // caused silent truncation mid-reasoning. Raised to 10.
        // Raised again to 15 to support readLeadDetails loops over multiple leads.
        stopWhen: stepCountIs(15),
        providerOptions: {
          anthropic: {
            // Adaptive thinking: Claude automatically decides how much reasoning
            // to use based on prompt complexity. Supported on claude-opus-4-6+.
            thinking: { type: "adaptive" },
          },
        },
      });
      writer.merge(result.toUIMessageStream());
    },
    onError: (err) => `I encountered an error: ${String(err)}`,
  });

  return createUIMessageStreamResponse({ stream });
}
