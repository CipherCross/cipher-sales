import { tool, zodSchema } from "ai";
import { z } from "zod";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, companies, contacts, outreach, upworkOutreach } from "@/db/schema";
import { withToolError } from "./shared/withToolError";

export const detailTools = {
  // ── 17. Read full lead details ──────────────────────────────────────────
  readLeadDetails: tool({
    description:
      "Deep-read a single lead's full qualitative data: message history, correspondence extract, " +
      "call notes, call transcripts, and internal notes. " +
      "Use this after identifying a lead from getRecentResponses, getLeadPipeline, or getUpworkRecentActivity " +
      "to understand the story behind the numbers. " +
      "For LinkedIn leads use source='linkedin'; for Upwork direct-outreach leads use source='upwork'. " +
      "Search by airtableId (exact, preferred when available) or by name (partial, case-insensitive match on full_name / client_name). " +
      "To summarize multiple leads, call this tool once per lead — the agent can loop up to the step limit.",
    inputSchema: zodSchema(
      z.object({
        source: z
          .enum(["linkedin", "upwork"])
          .describe('"linkedin" for LinkedIn outreach leads, "upwork" for Upwork direct-outreach leads.'),
        searchBy: z
          .enum(["airtableId", "name"])
          .describe('"airtableId" for exact lookup (preferred), "name" for partial case-insensitive name search.'),
        value: z
          .string()
          .describe("The airtableId string, or the full/partial name to search for."),
      }),
    ),
    execute: withToolError(async ({ source, searchBy, value }) => {
      // ── LinkedIn outreach ──────────────────────────────────────────────
      if (source === "linkedin") {
        const condition =
          searchBy === "airtableId"
            ? eq(outreach.airtableId, value)
            : sql`LOWER(${outreach.fullName}) LIKE ${"%" + value.toLowerCase() + "%"}`;

        const rows = await db
          .select({
            // Identity
            airtableId: outreach.airtableId,
            fullName: outreach.fullName,
            title: outreach.title,
            // Pipeline state
            stage: outreach.stage,
            leadStatus: outreach.leadStatus,
            outreachStatus: outreach.outreachStatus,
            responseCategory: outreach.responseCategory,
            responseSubcategory: outreach.responseSubcategory,
            whichMessageReplied: outreach.whichMessageReplied,
            // Dates
            connectedDate: outreach.connectedDate,
            repliedDate: outreach.repliedDate,
            nextActionDate: outreach.nextActionDate,
            currentFuStep: outreach.currentFuStep,
            lastTouchDate: outreach.lastTouchDate,
            // Rich text
            leadNotes: outreach.leadNotes,
            messageHistory: outreach.messageHistory,
            correspondenceExtract: outreach.correspondenceExtract,
            notesBeforeCall: outreach.notesBeforeCall,
            // Initial call
            initialCallStatus: outreach.initialCallStatus,
            initialCallDate: outreach.initialCallDate,
            initialCallResult: outreach.initialCallResult,
            initialCallNotes: outreach.initialCallNotes,
            initialCallTranscript: outreach.initialCallTranscript,
            // Company context
            companyName: companies.companyName,
            industry: companies.industry,
            hqCountry: companies.hqCountry,
            employees: companies.employees,
            aiNiche: companies.aiNiche,
            // Campaign context
            campaignName: campaigns.name,
          })
          .from(outreach)
          .leftJoin(contacts, eq(outreach.contactId, contacts.id))
          .leftJoin(companies, eq(outreach.companyId, companies.id))
          .leftJoin(campaigns, eq(contacts.campaignId, campaigns.id))
          .where(condition)
          .limit(1);

        if (rows.length === 0) {
          return { error: `No LinkedIn lead found where ${searchBy} matches "${value}".`, detail: "" };
        }
        return rows[0];
      }

      // ── Upwork outreach ────────────────────────────────────────────────
      const condition =
        searchBy === "airtableId"
          ? eq(upworkOutreach.airtableId, value)
          : sql`LOWER(${upworkOutreach.clientName}) LIKE ${"%" + value.toLowerCase() + "%"}`;

      const rows = await db
        .select({
          // Identity
          airtableId: upworkOutreach.airtableId,
          clientName: upworkOutreach.clientName,
          stage: upworkOutreach.stage,
          jobTitle: upworkOutreach.jobTitle,
          profile: upworkOutreach.profile,
          clientCountry: upworkOutreach.clientCountry,
          // Dates
          proposalSent: upworkOutreach.proposalSent,
          viewDate: upworkOutreach.viewDate,
          replyDate: upworkOutreach.replyDate,
          nextActionDate: upworkOutreach.nextActionDate,
          currentFuStep: upworkOutreach.currentFuStep,
          lastContact: upworkOutreach.lastContact,
          // Rich text — outreach content
          coverLetter: upworkOutreach.coverLetter,
          initialMessage: upworkOutreach.initialMessage,
          messageHistory: upworkOutreach.messageHistory,
          correspondenceExtract: upworkOutreach.correspondenceExtract,
          tasksNotes: upworkOutreach.tasksNotes,
          // Call prep & notes
          notesBeforeCall: upworkOutreach.notesBeforeCall,
          // Initial call
          initialCallStatus: upworkOutreach.initialCallStatus,
          initialCallDate: upworkOutreach.initialCallDate,
          initialCallResult: upworkOutreach.initialCallResult,
          initialCallNotes: upworkOutreach.initialCallNotes,
          initialCallTranscript: upworkOutreach.initialCallTranscript,
          // Second call
          secondCallStatus: upworkOutreach.secondCallStatus,
          secondCallDate: upworkOutreach.secondCallDate,
          secondCallResult: upworkOutreach.secondCallResult,
          secondCallNotes: upworkOutreach.secondCallNotes,
          secondCallTranscript: upworkOutreach.secondCallTranscript,
          // Estimate
          estimateAmount: upworkOutreach.estimateAmount,
          estimateResult: upworkOutreach.estimateResult,
          estimatePresentationNotes: upworkOutreach.estimatePresentationNotes,
          // Lost / dropped
          lostReason: upworkOutreach.lostReason,
          lostNotes: upworkOutreach.lostNotes,
        })
        .from(upworkOutreach)
        .where(condition)
        .limit(1);

      if (rows.length === 0) {
        return { error: `No Upwork outreach lead found where ${searchBy} matches "${value}".`, detail: "" };
      }
      return rows[0];
    }),
  }),
};
