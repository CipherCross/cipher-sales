import { pgTable, pgSchema, uuid, varchar, text, timestamp, integer, real, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Upwork schema ────────────────────────────────────────────────────────────
export const upworkSchema = pgSchema("upwork");

export const upworkBids = upworkSchema.table("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  uid: varchar("uid"),
  jobQuality: varchar("job_quality"),
  bidStatus: varchar("bid_status"),
  interviews: integer("interviews"),
  jobLink: varchar("job_link"),
  jobTitle: varchar("job_title"),
  jobStatus: varchar("job_status"),
  jobDescription: text("job_description"),
  jobCreatedAt: timestamp("job_created_at"),
  clientCountry: varchar("client_country"),
  avgHourlyRate: real("avg_hourly_rate"),
  totalSpent: real("total_spent"),
  totalHires: integer("total_hires"),
  hireRate: real("hire_rate"),
  feedbackCount: integer("feedback_count"),
  feedbackScore: real("feedback_score"),
  profile: varchar("profile"),
  searchName: varchar("search_name"),
  proposalSent: timestamp("proposal_sent"),
  coverLetter: text("cover_letter"),
  boosted: varchar("boosted"),
  boostOutbid: varchar("boost_outbid"),
  connectsSpent: integer("connects_spent"),
  managerName: varchar("manager_name"),
  viewStatus: varchar("view_status"),
  viewDate: timestamp("view_date"),
  replyStatus: varchar("reply_status"),
  replyDate: timestamp("reply_date"),
  proposalResults: varchar("proposal_results"),
  budget: varchar("budget"),
  createdAt: timestamp("created_at"),
  lastModified: timestamp("last_modified"),
});

export const upworkOutreach = upworkSchema.table("outreach", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  uid: varchar("uid"),
  sourceData: varchar("source_data"),
  jobQuality: varchar("job_quality"),
  stage: varchar("stage"),
  clientName: varchar("client_name"),
  profile: varchar("profile"),
  proposalSent: timestamp("proposal_sent"),
  coverLetter: text("cover_letter"),
  initialMessage: text("initial_message"),
  viewDate: timestamp("view_date"),
  replyDate: timestamp("reply_date"),
  jobTitle: varchar("job_title"),
  jobDescription: text("job_description"),
  jobLink: varchar("job_link"),
  jobCreatedAt: timestamp("job_created_at"),
  clientCountry: varchar("client_country"),
  totalSpent: real("total_spent"),
  avgHourlyRate: real("avg_hourly_rate"),
  totalHires: integer("total_hires"),
  hireRate: real("hire_rate"),
  feedbackCount: integer("feedback_count"),
  feedbackScore: real("feedback_score"),
  chatLink: varchar("chat_link"),
  messageHistory: text("message_history"),
  correspondenceExtract: text("correspondence_extract"),
  nextActionDate: date("next_action_date"),
  currentFuStep: varchar("current_fu_step"),
  tasksNotes: text("tasks_notes"),
  lastContact: timestamp("last_contact"),
  notesBeforeCall: text("notes_before_call"),
  initialCallStatus: varchar("initial_call_status"),
  initialCallDate: timestamp("initial_call_date"),
  initialCallResult: varchar("initial_call_result"),
  initialCallNotes: text("initial_call_notes"),
  initialCallTranscript: text("initial_call_transcript"),
  secondCallStatus: varchar("second_call_status"),
  secondCallDate: timestamp("second_call_date"),
  secondCallResult: varchar("second_call_result"),
  secondCallNotes: text("second_call_notes"),
  secondCallTranscript: text("second_call_transcript"),
  estimateLink: varchar("estimate_link"),
  estimateAmount: real("estimate_amount"),
  estimatePresentationCallStatus: varchar("estimate_presentation_call_status"),
  estimatePresentationCallDate: timestamp("estimate_presentation_call_date"),
  estimateResult: varchar("estimate_result"),
  estimatePresentationNotes: text("estimate_presentation_notes"),
  actualCall: varchar("actual_call"),
  missingCallResult: varchar("missing_call_result"),
  lostReason: varchar("lost_reason"),
  lostNotes: text("lost_notes"),
  createdAt: timestamp("created_at"),
  lastModified: timestamp("last_modified"),
});

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  companyName: varchar("company_name"),
  websiteUrl: varchar("website_url"),
  linkedinUrl: varchar("linkedin_url"),
  hqCountry: varchar("hq_country"),
  industry: varchar("industry"),
  employees: varchar("employees"),
  aiNiche: varchar("ai_niche"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  name: varchar("name"),
  status: varchar("status"),
  message1: text("message_1"),
  message2: text("message_2"),
  message3: text("message_3"),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  fullName: varchar("full_name"),
  title: varchar("title"),
  readinessStatus: varchar("readiness_status"),
  hook1Ai: text("hook_1_ai"),
  hook1Manual: text("hook_1_manual"),
  hook2Ai: text("hook_2_ai"),
  hook2Manual: text("hook_2_manual"),
});

export const outreach = pgTable("outreach", {
  id: uuid("id").primaryKey().defaultRandom(),
  airtableId: varchar("airtable_id").unique().notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  stage: varchar("stage"),
  leadStatus: varchar("lead_status"),
  connectedDate: timestamp("connected_date"),
  repliedDate: timestamp("replied_date"),
  whichMessageReplied: varchar("which_message_replied"),
  responseCategory: varchar("response_category"),
  initialCallStatus: varchar("initial_call_status"),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  contacts: many(contacts),
  outreach: many(outreach),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  campaign: one(campaigns, { fields: [contacts.campaignId], references: [campaigns.id] }),
  outreach: many(outreach),
}));

export const outreachRelations = relations(outreach, ({ one }) => ({
  contact: one(contacts, { fields: [outreach.contactId], references: [contacts.id] }),
  campaign: one(campaigns, { fields: [outreach.campaignId], references: [campaigns.id] }),
}));

// ─── Upwork relations ─────────────────────────────────────────────────────────
// (no FK between the two Upwork tables — they are independent Airtable tables)
