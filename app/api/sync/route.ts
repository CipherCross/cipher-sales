import { NextRequest, NextResponse } from "next/server";
import Airtable from "airtable";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { companies, campaigns, contacts, outreach, upworkBids, upworkOutreach } from "@/db/schema";

const LINKEDIN_BASE_ID = "app4P6PbWSwEEmOIz";
const UPWORK_BASE_ID = "appfQxws68Ptopf1C";

const TABLE = {
  COMPANIES: "Companies",
  CAMPAIGNS: "Campaigns",
  CONTACTS: "Contacts",
  OUTREACH: "Outreach",
};

const UPWORK_TABLE = {
  BIDS: "Bids",
  OUTREACH: "Outreach",
};

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

async function fetchAll(base: Airtable.Base, table: string): Promise<Airtable.Record<Airtable.FieldSet>[]> {
  const records: Airtable.Record<Airtable.FieldSet>[] = [];
  await base(table)
    .select()
    .eachPage((page, next) => {
      records.push(...page);
      next();
    });
  return records;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const linkedinBase = getBase(LINKEDIN_BASE_ID);
    const upworkBase = getBase(UPWORK_BASE_ID);
    const results = { companies: 0, campaigns: 0, contacts: 0, outreach: 0, upworkBids: 0, upworkOutreach: 0 };

    // ════════════════════════════════════════════════════════════════════════
    // LINKEDIN PIPELINE
    // ════════════════════════════════════════════════════════════════════════

    // ── 1. Companies ──────────────────────────────────────────────────────────
    const companyRecords = await fetchAll(linkedinBase, TABLE.COMPANIES);
    const companyIdMap = new Map<string, string>(); // airtable_id → pg uuid

    for (const rec of companyRecords) {
      const f = rec.fields;
      const row = {
        airtableId: rec.id,
        companyName: (f["Company name"] as string) ?? null,
        websiteUrl: (f["Website URL"] as string) ?? null,
        linkedinUrl: (f["LinkedIn URL"] as string) ?? null,
        hqCountry: (f["HQ country"] as string) ?? null,
        industry: (f["Industry"] as string) ?? null,
        employees: f["Employees"] != null ? String(f["Employees"]) : null,
        aiNiche: (f["AI Niche"] as string) ?? null,
      };

      const [upserted] = await db
        .insert(companies)
        .values(row)
        .onConflictDoUpdate({ target: companies.airtableId, set: row })
        .returning({ id: companies.id });

      companyIdMap.set(rec.id, upserted.id);
    }
    results.companies = companyRecords.length;

    // ── 2. Campaigns ──────────────────────────────────────────────────────────
    const campaignRecords = await fetchAll(linkedinBase, TABLE.CAMPAIGNS);
    const campaignIdMap = new Map<string, string>(); // airtable_id → pg uuid
    // reverse map: contact airtable_id → campaign airtable_id
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
      };

      const [upserted] = await db
        .insert(campaigns)
        .values(row)
        .onConflictDoUpdate({ target: campaigns.airtableId, set: row })
        .returning({ id: campaigns.id });

      campaignIdMap.set(rec.id, upserted.id);

      // build reverse map for contacts
      for (const contactAirtableId of linkedIds(f["Contacts"])) {
        contactToCampaignAirtable.set(contactAirtableId, rec.id);
      }
    }
    results.campaigns = campaignRecords.length;

    // ── 3. Contacts ───────────────────────────────────────────────────────────
    const contactRecords = await fetchAll(linkedinBase, TABLE.CONTACTS);
    const contactIdMap = new Map<string, string>(); // airtable_id → pg uuid

    for (const rec of contactRecords) {
      const f = rec.fields;
      const companyAirtableId = linkedId(f["Company"]);
      const campaignAirtableId = contactToCampaignAirtable.get(rec.id) ?? null;

      const row = {
        airtableId: rec.id,
        companyId: companyAirtableId ? (companyIdMap.get(companyAirtableId) ?? null) : null,
        campaignId: campaignAirtableId ? (campaignIdMap.get(campaignAirtableId) ?? null) : null,
        fullName: (f["Full name"] as string) ?? null,
        title: (f["Title"] as string) ?? null,
        readinessStatus: (f["Readiness status"] as string) ?? null,
        hook1Ai: (f["hook_1_AI"] as string) ?? null,
        hook1Manual: (f["hook_1_manual"] as string) ?? null,
        hook2Ai: (f["hook_2_AI"] as string) ?? null,
        hook2Manual: (f["hook_2_manual"] as string) ?? null,
      };

      const [upserted] = await db
        .insert(contacts)
        .values(row)
        .onConflictDoUpdate({ target: contacts.airtableId, set: row })
        .returning({ id: contacts.id });

      contactIdMap.set(rec.id, upserted.id);
    }
    results.contacts = contactRecords.length;

    // ── 4. Outreach ───────────────────────────────────────────────────────────
    const outreachRecords = await fetchAll(linkedinBase, TABLE.OUTREACH);

    for (const rec of outreachRecords) {
      const f = rec.fields;
      const contactAirtableId = linkedId(f["Original Lead Data"]);
      const contactPgId = contactAirtableId ? (contactIdMap.get(contactAirtableId) ?? null) : null;

      // derive campaign from the contact
      const campaignAirtableId = contactAirtableId ? (contactToCampaignAirtable.get(contactAirtableId) ?? null) : null;

      const row = {
        airtableId: rec.id,
        contactId: contactPgId,
        campaignId: campaignAirtableId ? (campaignIdMap.get(campaignAirtableId) ?? null) : null,
        stage: (f["Stage"] as string) ?? null,
        leadStatus: (f["Lead Status"] as string) ?? null,
        connectedDate: parseDate(f["Connected Date"]),
        repliedDate: parseDate(f["Replied Date"]),
        whichMessageReplied: (f["Which message replied"] as string) ?? null,
        responseCategory: (f["Response Category"] as string) ?? null,
        initialCallStatus: (f["Initial Call Status"] as string) ?? null,
      };

      await db.insert(outreach).values(row).onConflictDoUpdate({ target: outreach.airtableId, set: row });
    }
    results.outreach = outreachRecords.length;

    // ════════════════════════════════════════════════════════════════════════
    // UPWORK PIPELINE
    // ════════════════════════════════════════════════════════════════════════

    // ── 5. Upwork Bids ────────────────────────────────────────────────────────
    const bidRecords = await fetchAll(upworkBase, UPWORK_TABLE.BIDS);

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

      await db.insert(upworkBids).values(row).onConflictDoUpdate({ target: upworkBids.airtableId, set: row });
    }
    results.upworkBids = bidRecords.length;

    // ── 6. Upwork Outreach ────────────────────────────────────────────────────
    const upworkOutreachRecords = await fetchAll(upworkBase, UPWORK_TABLE.OUTREACH);

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

      await db.insert(upworkOutreach).values(row).onConflictDoUpdate({ target: upworkOutreach.airtableId, set: row });
    }
    results.upworkOutreach = upworkOutreachRecords.length;

    return NextResponse.json({ ok: true, synced: results });
  } catch (err) {
    console.error("[sync]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Vercel Cron hits GET
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization");
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return POST(req);
}
