import { tool, zodSchema } from "ai";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { withToolError } from "./shared/withToolError";

/**
 * Keywords that must never appear in an AI-generated SELECT query.
 * Checked against the uppercased, whitespace-normalised query string.
 */
const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXECUTE",
  "CALL",
  "DO",
  "COPY",
  "VACUUM",
  "ANALYZE",
  "EXPLAIN",
  "SET ",      // SET session var — trailing space avoids matching "set_config" etc.
  "PERFORM",
  "pg_read_file",
  "pg_ls_dir",
  "pg_sleep",
] as const;

/** Caps to keep individual result sets readable in the chat UI. */
const MAX_ROWS = 200;

export const sqlTools = {
  // ── 18. Free-form SQL ───────────────────────────────────────────────────
  executeSQL: tool({
    description:
      "Execute a read-only PostgreSQL SELECT (or CTE) query for ad-hoc analysis that the pre-built tools cannot answer. " +
      "Use this for cross-table correlations, custom aggregations, segmentation cuts, or any question that needs a bespoke query. " +
      "Only SELECT and WITH … SELECT (CTEs) are allowed — no mutations. " +
      "Always use fully-qualified table names: public.outreach, public.contacts, public.companies, public.campaigns, upwork.bids, upwork.outreach. " +
      "Results are capped at 200 rows. " +
      "SCHEMA REFERENCE:\n" +
      "  public.companies       — id, airtable_id, company_name, approve_status, website_url, linkedin_url, hq_country, founded_year, employees, industry, keywords, description, ai_site_info, ai_niche, created_at, last_modified\n" +
      "  public.campaigns       — id, airtable_id, name, status, message_1..5, personalization_generation\n" +
      "  public.contacts        — id, airtable_id, company_id→companies, campaign_id→campaigns, persona_linkedin, approve_status, readiness_status, full_name, first_name, title, hook_1_ai..5_ai, hook_1_manual..5_manual, created_at, last_modified\n" +
      "  public.outreach        — id, airtable_id, contact_id→contacts, company_id→companies, persona_linkedin, stage, lead_status, full_name, title, lead_notes, outreach_status[Waiting|Active|Connected|Replied|Continued|Stopped], connected_date(date), replied_date(date), which_message_replied, response_category, response_subcategory, next_action_date(date), current_fu_step, chat_link, message_history, correspondence_extract, notes_before_call, initial_call_status, initial_call_date(timestamp), initial_call_result, initial_call_notes, initial_call_transcript, start_date(date), last_touch_date(date), status_change_date(date), created_at\n" +
      "  upwork.bids            — id, airtable_id, uid, job_quality, bid_status, interviews(int), job_link, job_title, job_status, job_description, job_created_at(timestamp), client_country, avg_hourly_rate, total_spent, total_hires, hire_rate, feedback_count, feedback_score, profile, search_name, proposal_sent(timestamp), cover_letter, boosted, boost_outbid, connects_spent(int), manager_name, view_status[Viewed|Not Viewed], view_date(timestamp), reply_status[Replied|No Reply], reply_date(timestamp), proposal_results, budget, created_at, last_modified\n" +
      "  upwork.outreach        — id, airtable_id, uid, source_data, job_quality, stage, client_name, profile, proposal_sent(timestamp), cover_letter, initial_message, view_date(timestamp), reply_date(timestamp), job_title, job_description, job_link, job_created_at(timestamp), client_country, total_spent, avg_hourly_rate, total_hires, hire_rate, feedback_count, feedback_score, chat_link, message_history, correspondence_extract, next_action_date(date), current_fu_step, tasks_notes, last_contact(timestamp), notes_before_call, initial_call_status, initial_call_date(timestamp), initial_call_result, initial_call_notes, initial_call_transcript, second_call_status, second_call_date(timestamp), second_call_result, second_call_notes, second_call_transcript, estimate_link, estimate_amount, estimate_presentation_call_status, estimate_presentation_call_date(timestamp), estimate_result, estimate_presentation_notes, actual_call, missing_call_result, lost_reason, lost_notes, created_at, last_modified",
    inputSchema: zodSchema(
      z.object({
        query: z
          .string()
          .describe(
            "A valid PostgreSQL SELECT (or WITH … SELECT) statement. " +
            "Use fully-qualified table names (public.outreach, upwork.bids, etc.). " +
            "Do not add a trailing semicolon.",
          ),
        reasoning: z
          .string()
          .describe("One sentence explaining what analytical question this query is answering."),
      }),
    ),
    execute: withToolError(async ({ query, reasoning }) => {
      // ── Safety checks ────────────────────────────────────────────────
      const normalised = query.trim().replace(/\s+/g, " ").toUpperCase();

      const startsOk = normalised.startsWith("SELECT") || normalised.startsWith("WITH");
      if (!startsOk) {
        throw new Error(
          "Only SELECT or WITH … SELECT (CTE) queries are permitted. Received a statement starting with a different keyword.",
        );
      }

      for (const kw of BLOCKED_KEYWORDS) {
        // Word-boundary check: keyword must be preceded by start-of-string,
        // whitespace, or a semicolon to avoid false positives inside identifiers.
        const pattern = new RegExp(`(^|[\\s;])${kw.trim()}(\\s|$|\\()`);
        if (pattern.test(normalised)) {
          throw new Error(`Keyword "${kw.trim()}" is not allowed in read-only queries.`);
        }
      }

      // ── Execute ──────────────────────────────────────────────────────
      console.log(`[executeSQL] ${reasoning}\n${query}`);

      const result = await db.execute(sql.raw(query));

      // Drizzle's db.execute returns the raw postgres.js result object.
      // The row array lives on .rows in some versions and is the value itself in others.
      const rawRows: unknown = result;
      const rows: Record<string, unknown>[] = Array.isArray(rawRows)
        ? (rawRows as Record<string, unknown>[])
        : Array.isArray((rawRows as { rows?: unknown }).rows)
          ? ((rawRows as { rows: Record<string, unknown>[] }).rows)
          : [];

      const truncated = rows.length > MAX_ROWS;
      const returned = truncated ? rows.slice(0, MAX_ROWS) : rows;

      return {
        reasoning,
        rowCount: rows.length,
        truncated,
        rows: returned,
      };
    }),
  }),
};
