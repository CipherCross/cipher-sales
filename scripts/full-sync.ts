/**
 * Full Airtable → Postgres sync script
 *
 * Clears every table in the DB, then downloads all records from Airtable
 * and inserts them fresh. Progress is reported live in the terminal.
 *
 * Usage:
 *   npx tsx scripts/full-sync.ts
 */

import "dotenv/config";
import Airtable from "airtable";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";

const {
  companies,
  campaigns,
  contacts,
  outreach,
  upworkBids,
  upworkOutreach,
} = schema;

// ─── Config ───────────────────────────────────────────────────────────────────

const LINKEDIN_BASE_ID = "app4P6PbWSwEEmOIz";
const UPWORK_BASE_ID = "appfQxws68Ptopf1C";

const TABLE = {
  COMPANIES: "Companies",
  CAMPAIGNS: "Campaigns",
  CONTACTS: "Contacts",
  OUTREACH: "Outreach",
} as const;

const UPWORK_TABLE = {
  BIDS: "Bids",
  OUTREACH: "Outreach",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

function getBase(baseId: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! }).base(baseId);
}

function linkedId(field: unknown): string | null {
  if (Array.isArray(field) && field.length > 0) return field[0] as string;
  return null;
}

function linkedIds(field: unknown): string[] {
  if (Array.isArray(field)) return field as string[];
  return [];
}

function parseDate(val: unknown): Date | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/** Fetch every record from an Airtable table, reporting page progress. */
async function fetchAll(
  base: Airtable.Base,
  table: string,
  label: string
): Promise<Airtable.Record<Airtable.FieldSet>[]> {
  const records: Airtable.Record<Airtable.FieldSet>[] = [];
  let page = 0;
  await base(table)
    .select()
    .eachPage((pageRecords, next) => {
      page++;
      records.push(...pageRecords);
      process.stdout.write(
        `\r  ↳ Fetching ${label}… page ${page} (${records.length} records so far)`
      );
      next();
    });
  process.stdout.write(
    `\r  ✔ Fetched ${label}: ${records.length} records            \n`
  );
  return records;
}

function elapsed(start: number): string {
  return ((Date.now() - start) / 1000).toFixed(1) + "s";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║        FULL AIRTABLE → POSTGRES SYNC                ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ── Step 1: Clear the database ────────────────────────────────────────────
  console.log("① Clearing database…");

  // Delete in FK-safe order (children first)
  const tablesToClear = [
    { table: outreach, name: "outreach" },
    { table: contacts, name: "contacts" },
    { table: campaigns, name: "campaigns" },
    { table: companies, name: "companies" },
    { table: upworkOutreach, name: "upwork.outreach" },
    { table: upworkBids, name: "upwork.bids" },
  ];

  for (const { table, name } of tablesToClear) {
    const result = await db.delete(table).returning({ id: table.id });
    console.log(`  ✔ Cleared ${name} (${result.length} rows removed)`);
  }

  console.log("");

  // ── Step 2: Fetch from Airtable ───────────────────────────────────────────
  console.log("② Downloading records from Airtable…\n");

  const linkedinBase = getBase(LINKEDIN_BASE_ID);
  const upworkBase = getBase(UPWORK_BASE_ID);

  const companyRecords = await fetchAll(linkedinBase, TABLE.COMPANIES, "Companies");
  const campaignRecords = await fetchAll(linkedinBase, TABLE.CAMPAIGNS, "Campaigns");
  const contactRecords = await fetchAll(linkedinBase, TABLE.CONTACTS, "Contacts");
  const outreachRecords = await fetchAll(linkedinBase, TABLE.OUTREACH, "Outreach");
  const bidRecords = await fetchAll(upworkBase, UPWORK_TABLE.BIDS, "Upwork Bids");
  const upworkOutreachRecords = await fetchAll(upworkBase, UPWORK_TABLE.OUTREACH, "Upwork Outreach");

  const totalRecords =
    companyRecords.length +
    campaignRecords.length +
    contactRecords.length +
    outreachRecords.length +
    bidRecords.length +
    upworkOutreachRecords.length;

  console.log(`\n  Total records downloaded: ${totalRecords}\n`);

  // ── Step 3: Insert into Postgres ──────────────────────────────────────────
  console.log("③ Inserting into Postgres…\n");

  let inserted = 0;
  const logProgress = (label: string) => {
    inserted++;
    process.stdout.write(
      `\r  ↳ [${inserted}/${totalRecords}] Inserting ${label}…`
    );
  };

  // ── 3a. Companies ─────────────────────────────────────────────────────────
  const companyIdMap = new Map<string, string>();

  for (const rec of companyRecords) {
    const f = rec.fields;
    const row = {
      airtableId: rec.id,
      companyName: (f["Company name"] as string) ?? null,
      approveStatus: (f["Approve Status"] as string) ?? null,
      companyNameForMailing: (f["Company name for mailing"] as string) ?? null,
      websiteUrl: (f["Website URL"] as string) ?? null,
      linkedinUrl: (f["LinkedIn URL"] as string) ?? null,
      webAppLink: (f["Web App Link"] as string) ?? null,
      hqCountry: (f["HQ country"] as string) ?? null,
      foundedYear: f["Founded Year"] != null ? Number(f["Founded Year"]) : null,
      employees: f["Employees"] != null ? Number(f["Employees"]) : null,
      industry: (f["Industry"] as string) ?? null,
      keywords: (f["Keywords"] as string) ?? null,
      description: (f["Description"] as string) ?? null,
      aiSiteInfo: (f["AI Site Info"] as string) ?? null,
      aiNiche: (f["AI Niche"] as string) ?? null,
      lastModified: parseDate(f["Last Modified"]),
    };

    const [upserted] = await db
      .insert(companies)
      .values(row)
      .returning({ id: companies.id });

    companyIdMap.set(rec.id, upserted.id);
    logProgress("Companies");
  }
  console.log(
    `\r  ✔ Companies: ${companyRecords.length} inserted                     `
  );

  // ── 3b. Campaigns ─────────────────────────────────────────────────────────
  const campaignIdMap = new Map<string, string>();
  const contactToCampaignAirtable = new Map<string, string>();

  for (const rec of campaignRecords) {
    const f = rec.fields;
    const row = {
      airtableId: rec.id,
      name: (f["Campaign Name"] as string) ?? null,
      status: (f["Status"] as string) ?? null,
      message1: (f["Message 1"] as string) ?? null,
      message2: (f["Message 2"] as string) ?? null,
      message3: (f["Message 3"] as string) ?? null,
      message4: (f["Message 4"] as string) ?? null,
      message5: (f["Message 5"] as string) ?? null,
      personalizationGeneration: (f["Personalization Generation"] as string) ?? null,
    };

    const [upserted] = await db
      .insert(campaigns)
      .values(row)
      .returning({ id: campaigns.id });

    campaignIdMap.set(rec.id, upserted.id);

    for (const contactAirtableId of linkedIds(f["Contacts"])) {
      contactToCampaignAirtable.set(contactAirtableId, rec.id);
    }
    logProgress("Campaigns");
  }
  console.log(
    `\r  ✔ Campaigns: ${campaignRecords.length} inserted                     `
  );

  // ── 3c. Contacts ──────────────────────────────────────────────────────────
  const contactIdMap = new Map<string, string>();

  for (const rec of contactRecords) {
    const f = rec.fields;
    const companyAirtableId = linkedId(f["Company"]);
    const campaignAirtableId = contactToCampaignAirtable.get(rec.id) ?? null;

    const row = {
      airtableId: rec.id,
      companyId: companyAirtableId ? (companyIdMap.get(companyAirtableId) ?? null) : null,
      campaignId: campaignAirtableId ? (campaignIdMap.get(campaignAirtableId) ?? null) : null,
      personaLinkedin: (f["Persona LinkedIn"] as string) ?? null,
      approveStatus: (f["Approve Status"] as string) ?? null,
      readinessStatus: (f["Readiness status"] as string) ?? null,
      fullName: (f["Full name"] as string) ?? null,
      firstName: (f["First name"] as string) ?? null,
      title: (f["Title"] as string) ?? null,
      hook1Ai: (f["hook_1_AI"] as string) ?? null,
      hook1Manual: (f["hook_1_manual"] as string) ?? null,
      hook2Ai: (f["hook_2_AI"] as string) ?? null,
      hook2Manual: (f["hook_2_manual"] as string) ?? null,
      hook3Ai: (f["hook_3_AI"] as string) ?? null,
      hook3Manual: (f["hook_3_manual"] as string) ?? null,
      hook4Ai: (f["hook_4_AI"] as string) ?? null,
      hook4Manual: (f["hook_4_manual"] as string) ?? null,
      hook5Ai: (f["hook_5_AI"] as string) ?? null,
      hook5Manual: (f["hook_5_manual"] as string) ?? null,
      lastModified: parseDate(f["Last Modified"]),
    };

    const [upserted] = await db
      .insert(contacts)
      .values(row)
      .returning({ id: contacts.id });

    contactIdMap.set(rec.id, upserted.id);
    logProgress("Contacts");
  }
  console.log(
    `\r  ✔ Contacts: ${contactRecords.length} inserted                       `
  );

  // ── 3d. Outreach ──────────────────────────────────────────────────────────
  for (const rec of outreachRecords) {
    const f = rec.fields;
    const contactAirtableId = linkedId(f["Original Lead Data"]);
    const contactPgId = contactAirtableId ? (contactIdMap.get(contactAirtableId) ?? null) : null;
    const companyAirtableId = linkedId(f["Company"]);

    const row = {
      airtableId: rec.id,
      contactId: contactPgId,
      companyId: companyAirtableId ? (companyIdMap.get(companyAirtableId) ?? null) : null,
      personaLinkedin: (f["Persona LinkedIn"] as string) ?? null,
      stage: (f["Stage"] as string) ?? null,
      leadStatus: (f["Lead Status"] as string) ?? null,
      fullName: (f["Full name"] as string) ?? null,
      title: (f["Title"] as string) ?? null,
      leadNotes: (f["Lead Notes"] as string) ?? null,
      outreachStatus: (f["Outreach Status"] as string) ?? null,
      connectedDate: (f["Connected Date"] as string) ?? null,
      repliedDate: (f["Replied Date"] as string) ?? null,
      whichMessageReplied: (f["Which message replied"] as string) ?? null,
      responseCategory: (f["Response Category"] as string) ?? null,
      responseSubcategory: (f["Response Subcategory"] as string) ?? null,
      nextActionDate: (f["Next Action Date"] as string) ?? null,
      currentFuStep: (f["Current FU Step"] as string) ?? null,
      chatLink: (f["Chat Link"] as string) ?? null,
      messageHistory: (f["Message History"] as string) ?? null,
      correspondenceExtract: (f["Correspondence Extract"] as string) ?? null,
      notesBeforeCall: (f["Notes before the call"] as string) ?? null,
      initialCallStatus: (f["Initial Call Status"] as string) ?? null,
      initialCallDate: parseDate(f["Initial Call Date"]),
      initialCallResult: (f["Initial Call Result"] as string) ?? null,
      initialCallNotes: (f["Initial Call Notes"] as string) ?? null,
      initialCallTranscript: (f["Initial Call Transcript"] as string) ?? null,
      startDate: (f["Start Date"] as string) ?? null,
      lastTouchDate: (f["Last Touch Date"] as string) ?? null,
      statusChangeDate: (f["Status Change Date"] as string) ?? null,
    };

    await db.insert(outreach).values(row);
    logProgress("Outreach");
  }
  console.log(
    `\r  ✔ Outreach: ${outreachRecords.length} inserted                      `
  );

  // ── 3e. Upwork Bids ───────────────────────────────────────────────────────
  for (const rec of bidRecords) {
    const f = rec.fields;
    const row = {
      airtableId: rec.id,
      uid: (f["uid"] as string) ?? null,
      jobQuality: (f["Job Quality"] as string) ?? null,
      bidStatus: (f["Bid status"] as string) ?? null,
      interviews: f["Interviews"] != null ? Number(f["Interviews"]) : null,
      jobLink: (f["Job link"] as string) ?? null,
      jobTitle: (f["Job title"] as string) ?? null,
      jobStatus: (f["Job status"] as string) ?? null,
      jobDescription: (f["Job Description"] as string) ?? null,
      jobCreatedAt: parseDate(f["Job Created At"]),
      clientCountry: (f["Client Country"] as string) ?? null,
      avgHourlyRate: f["Avg Hourly Rate"] != null ? Number(f["Avg Hourly Rate"]) : null,
      totalSpent: f["Total Spent"] != null ? Number(f["Total Spent"]) : null,
      totalHires: f["Total Hires"] != null ? Number(f["Total Hires"]) : null,
      hireRate: f["Hire Rate"] != null ? Number(f["Hire Rate"]) : null,
      feedbackCount: f["Feedback Count"] != null ? Number(f["Feedback Count"]) : null,
      feedbackScore: f["Feedback Score"] != null ? Number(f["Feedback Score"]) : null,
      profile: (f["Profile"] as string) ?? null,
      searchName: (f["Search Name"] as string) ?? null,
      proposalSent: parseDate(f["Proposal Sent"]),
      coverLetter: (f["Cover Letter"] as string) ?? null,
      boosted: (f["Boosted"] as string) ?? null,
      boostOutbid: (f["Boost Outbid"] as string) ?? null,
      connectsSpent: f["Connects Spent"] != null ? Number(f["Connects Spent"]) : null,
      managerName: (f["Manager Name"] as string) ?? null,
      viewStatus: (f["View Status"] as string) ?? null,
      viewDate: parseDate(f["View Date"]),
      replyStatus: (f["Reply Status"] as string) ?? null,
      replyDate: parseDate(f["Reply Date"]),
      proposalResults: (f["Proposal Results"] as string) ?? null,
      budget: (f["Budget"] as string) ?? null,
      createdAt: parseDate(f["Created"]),
      lastModified: parseDate(f["Last Modified"]),
    };

    await db.insert(upworkBids).values(row);
    logProgress("Upwork Bids");
  }
  console.log(
    `\r  ✔ Upwork Bids: ${bidRecords.length} inserted                       `
  );

  // ── 3f. Upwork Outreach ───────────────────────────────────────────────────
  for (const rec of upworkOutreachRecords) {
    const f = rec.fields;
    const row = {
      airtableId: rec.id,
      uid: (f["uid"] as string) ?? null,
      sourceData: (f["Source Data"] as string) ?? null,
      jobQuality: (f["Job Quality"] as string) ?? null,
      stage: (f["Stage"] as string) ?? null,
      clientName: (f["Client Name"] as string) ?? null,
      profile: (f["Profile"] as string) ?? null,
      proposalSent: parseDate(f["Proposal Sent"]),
      coverLetter: (f["Cover Letter"] as string) ?? null,
      initialMessage: (f["Initial Message"] as string) ?? null,
      viewDate: parseDate(f["View Date"]),
      replyDate: parseDate(f["Reply Date"]),
      jobTitle: (f["Job Title"] as string) ?? null,
      jobDescription: (f["Job Description"] as string) ?? null,
      jobLink: (f["Job Link"] as string) ?? null,
      jobCreatedAt: parseDate(f["Job Created At"]),
      clientCountry: (f["Client Country"] as string) ?? null,
      totalSpent: f["Total Spent"] != null ? Number(f["Total Spent"]) : null,
      avgHourlyRate: f["Avg Hourly Rate"] != null ? Number(f["Avg Hourly Rate"]) : null,
      totalHires: f["Total Hires"] != null ? Number(f["Total Hires"]) : null,
      hireRate: f["Hire Rate"] != null ? Number(f["Hire Rate"]) : null,
      feedbackCount: f["Feedback Count"] != null ? Number(f["Feedback Count"]) : null,
      feedbackScore: f["Feedback Score"] != null ? Number(f["Feedback Score"]) : null,
      chatLink: (f["Chat Link"] as string) ?? null,
      messageHistory: (f["Message History"] as string) ?? null,
      correspondenceExtract: (f["Correspondence Extract"] as string) ?? null,
      nextActionDate: (f["Next Action Date"] as string) ?? null,
      currentFuStep: (f["Current FU Step"] as string) ?? null,
      tasksNotes: (f["Tasks / Notes"] as string) ?? null,
      lastContact: parseDate(f["Last Contact"]),
      notesBeforeCall: (f["Notes before the call"] as string) ?? null,
      initialCallStatus: (f["Initial Call Status"] as string) ?? null,
      initialCallDate: parseDate(f["Initial Call Date"]),
      initialCallResult: (f["Initial Call Result"] as string) ?? null,
      initialCallNotes: (f["Initial Call Notes"] as string) ?? null,
      initialCallTranscript: (f["Initial Call Transcript"] as string) ?? null,
      secondCallStatus: (f["Second Call Status"] as string) ?? null,
      secondCallDate: parseDate(f["Second Call Date"]),
      secondCallResult: (f["Second Call Result"] as string) ?? null,
      secondCallNotes: (f["Second Call Notes"] as string) ?? null,
      secondCallTranscript: (f["Second Call Transcript"] as string) ?? null,
      estimateLink: (f["Estimate Link"] as string) ?? null,
      estimateAmount: f["Estimate Amount"] != null ? Number(f["Estimate Amount"]) : null,
      estimatePresentationCallStatus: (f["Estimate Presentation Call Status"] as string) ?? null,
      estimatePresentationCallDate: parseDate(f["Estimate Presentation Call Date"]),
      estimateResult: (f["Estimate Result"] as string) ?? null,
      estimatePresentationNotes: (f["Estimate Presentation Notes"] as string) ?? null,
      actualCall: (f["Actual Call"] as string) ?? null,
      missingCallResult: (f["Missing Call Result"] as string) ?? null,
      lostReason: (f["Lost Reason"] as string) ?? null,
      lostNotes: (f["Lost Notes"] as string) ?? null,
      createdAt: parseDate(f["Created"]),
      lastModified: parseDate(f["Last Modified"]),
    };

    await db.insert(upworkOutreach).values(row);
    logProgress("Upwork Outreach");
  }
  console.log(
    `\r  ✔ Upwork Outreach: ${upworkOutreachRecords.length} inserted                `
  );

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                    SYNC COMPLETE                    ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Companies:        ${String(companyRecords.length).padStart(6)}                         ║`);
  console.log(`║  Campaigns:        ${String(campaignRecords.length).padStart(6)}                         ║`);
  console.log(`║  Contacts:         ${String(contactRecords.length).padStart(6)}                         ║`);
  console.log(`║  Outreach:         ${String(outreachRecords.length).padStart(6)}                         ║`);
  console.log(`║  Upwork Bids:      ${String(bidRecords.length).padStart(6)}                         ║`);
  console.log(`║  Upwork Outreach:  ${String(upworkOutreachRecords.length).padStart(6)}                         ║`);
  console.log(`║  ─────────────────────────                         ║`);
  console.log(`║  Total:            ${String(totalRecords).padStart(6)}   (${elapsed(t0)})             ║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n\n❌ Fatal error:", err);
  client.end().finally(() => process.exit(1));
});
