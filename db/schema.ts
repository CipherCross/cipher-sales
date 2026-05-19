import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  airtableId: varchar('airtable_id').unique().notNull(),
  companyName: varchar('company_name'),
  websiteUrl: varchar('website_url'),
  linkedinUrl: varchar('linkedin_url'),
  hqCountry: varchar('hq_country'),
  industry: varchar('industry'),
  employees: varchar('employees'),
  aiNiche: varchar('ai_niche'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  airtableId: varchar('airtable_id').unique().notNull(),
  name: varchar('name'),
  status: varchar('status'),
  message1: text('message_1'),
  message2: text('message_2'),
  message3: text('message_3'),
})

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  airtableId: varchar('airtable_id').unique().notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  fullName: varchar('full_name'),
  title: varchar('title'),
  readinessStatus: varchar('readiness_status'),
  hook1Ai: text('hook_1_ai'),
  hook1Manual: text('hook_1_manual'),
  hook2Ai: text('hook_2_ai'),
  hook2Manual: text('hook_2_manual'),
})

export const outreach = pgTable('outreach', {
  id: uuid('id').primaryKey().defaultRandom(),
  airtableId: varchar('airtable_id').unique().notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  stage: varchar('stage'),
  leadStatus: varchar('lead_status'),
  connectedDate: timestamp('connected_date'),
  repliedDate: timestamp('replied_date'),
  whichMessageReplied: varchar('which_message_replied'),
  responseCategory: varchar('response_category'),
  initialCallStatus: varchar('initial_call_status'),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
}))

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  contacts: many(contacts),
  outreach: many(outreach),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  campaign: one(campaigns, { fields: [contacts.campaignId], references: [campaigns.id] }),
  outreach: many(outreach),
}))

export const outreachRelations = relations(outreach, ({ one }) => ({
  contact: one(contacts, { fields: [outreach.contactId], references: [contacts.id] }),
  campaign: one(campaigns, { fields: [outreach.campaignId], references: [campaigns.id] }),
}))
