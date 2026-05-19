import { NextRequest, NextResponse } from 'next/server'
import Airtable from 'airtable'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { companies, campaigns, contacts, outreach } from '@/db/schema'

const BASE_ID = 'app4P6PbWSwEEmOIz'

const TABLE = {
  COMPANIES: 'Companies',
  CAMPAIGNS: 'Campaigns',
  CONTACTS: 'Contacts',
  OUTREACH: 'Outreach',
}

function getBase() {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! }).base(BASE_ID)
}

function linkedId(field: unknown): string | null {
  if (Array.isArray(field) && field.length > 0) return field[0] as string
  return null
}

function linkedIds(field: unknown): string[] {
  if (Array.isArray(field)) return field as string[]
  return []
}

function parseDate(val: unknown): Date | null {
  if (!val || typeof val !== 'string') return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

async function fetchAll(base: Airtable.Base, table: string): Promise<Airtable.Record<Airtable.FieldSet>[]> {
  const records: Airtable.Record<Airtable.FieldSet>[] = []
  await base(table).select().eachPage((page, next) => {
    records.push(...page)
    next()
  })
  return records
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const base = getBase()
    const results = { companies: 0, campaigns: 0, contacts: 0, outreach: 0 }

    // ── 1. Companies ──────────────────────────────────────────────────────────
    const companyRecords = await fetchAll(base, TABLE.COMPANIES)
    const companyIdMap = new Map<string, string>() // airtable_id → pg uuid

    for (const rec of companyRecords) {
      const f = rec.fields
      const row = {
        airtableId: rec.id,
        companyName: (f['Company name'] as string) ?? null,
        websiteUrl: (f['Website URL'] as string) ?? null,
        linkedinUrl: (f['LinkedIn URL'] as string) ?? null,
        hqCountry: (f['HQ country'] as string) ?? null,
        industry: (f['Industry'] as string) ?? null,
        employees: f['Employees'] != null ? String(f['Employees']) : null,
        aiNiche: (f['AI Niche'] as string) ?? null,
      }

      const [upserted] = await db
        .insert(companies)
        .values(row)
        .onConflictDoUpdate({ target: companies.airtableId, set: row })
        .returning({ id: companies.id })

      companyIdMap.set(rec.id, upserted.id)
    }
    results.companies = companyRecords.length

    // ── 2. Campaigns ──────────────────────────────────────────────────────────
    const campaignRecords = await fetchAll(base, TABLE.CAMPAIGNS)
    const campaignIdMap = new Map<string, string>() // airtable_id → pg uuid
    // reverse map: contact airtable_id → campaign airtable_id
    const contactToCampaignAirtable = new Map<string, string>()

    for (const rec of campaignRecords) {
      const f = rec.fields
      const row = {
        airtableId: rec.id,
        name: (f['Campaign Name'] as string) ?? null,
        status: (f['Status'] as string) ?? null,
        message1: (f['Message 1'] as string) ?? null,
        message2: (f['Message 2'] as string) ?? null,
        message3: (f['Message 3'] as string) ?? null,
      }

      const [upserted] = await db
        .insert(campaigns)
        .values(row)
        .onConflictDoUpdate({ target: campaigns.airtableId, set: row })
        .returning({ id: campaigns.id })

      campaignIdMap.set(rec.id, upserted.id)

      // build reverse map for contacts
      for (const contactAirtableId of linkedIds(f['Contacts'])) {
        contactToCampaignAirtable.set(contactAirtableId, rec.id)
      }
    }
    results.campaigns = campaignRecords.length

    // ── 3. Contacts ───────────────────────────────────────────────────────────
    const contactRecords = await fetchAll(base, TABLE.CONTACTS)
    const contactIdMap = new Map<string, string>() // airtable_id → pg uuid

    for (const rec of contactRecords) {
      const f = rec.fields
      const companyAirtableId = linkedId(f['Company'])
      const campaignAirtableId = contactToCampaignAirtable.get(rec.id) ?? null

      const row = {
        airtableId: rec.id,
        companyId: companyAirtableId ? (companyIdMap.get(companyAirtableId) ?? null) : null,
        campaignId: campaignAirtableId ? (campaignIdMap.get(campaignAirtableId) ?? null) : null,
        fullName: (f['Full name'] as string) ?? null,
        title: (f['Title'] as string) ?? null,
        readinessStatus: (f['Readiness status'] as string) ?? null,
        hook1Ai: (f['hook_1_AI'] as string) ?? null,
        hook1Manual: (f['hook_1_manual'] as string) ?? null,
        hook2Ai: (f['hook_2_AI'] as string) ?? null,
        hook2Manual: (f['hook_2_manual'] as string) ?? null,
      }

      const [upserted] = await db
        .insert(contacts)
        .values(row)
        .onConflictDoUpdate({ target: contacts.airtableId, set: row })
        .returning({ id: contacts.id })

      contactIdMap.set(rec.id, upserted.id)
    }
    results.contacts = contactRecords.length

    // ── 4. Outreach ───────────────────────────────────────────────────────────
    const outreachRecords = await fetchAll(base, TABLE.OUTREACH)

    for (const rec of outreachRecords) {
      const f = rec.fields
      const contactAirtableId = linkedId(f['Original Lead Data'])
      const contactPgId = contactAirtableId ? (contactIdMap.get(contactAirtableId) ?? null) : null

      // derive campaign from the contact
      const campaignAirtableId = contactAirtableId
        ? (contactToCampaignAirtable.get(contactAirtableId) ?? null)
        : null

      const row = {
        airtableId: rec.id,
        contactId: contactPgId,
        campaignId: campaignAirtableId ? (campaignIdMap.get(campaignAirtableId) ?? null) : null,
        stage: (f['Stage'] as string) ?? null,
        leadStatus: (f['Lead Status'] as string) ?? null,
        connectedDate: parseDate(f['Connected Date']),
        repliedDate: parseDate(f['Replied Date']),
        whichMessageReplied: (f['Which message replied'] as string) ?? null,
        responseCategory: (f['Response Category'] as string) ?? null,
        initialCallStatus: (f['Initial Call Status'] as string) ?? null,
      }

      await db
        .insert(outreach)
        .values(row)
        .onConflictDoUpdate({ target: outreach.airtableId, set: row })
    }
    results.outreach = outreachRecords.length

    return NextResponse.json({ ok: true, synced: results })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Vercel Cron hits GET
export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(req)
}

