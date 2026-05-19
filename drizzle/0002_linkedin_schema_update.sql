-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  companies — add missing fields, fix employees type                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE "companies" ADD COLUMN "approve_status" varchar;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "company_name_for_mailing" varchar;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "web_app_link" varchar;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "founded_year" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "keywords" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "ai_site_info" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "last_modified" timestamp;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "employees" SET DATA TYPE integer USING "employees"::integer;--> statement-breakpoint

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  campaigns — add message 4, 5, personalization flag                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE "campaigns" ADD COLUMN "message_4" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "message_5" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "personalization_generation" varchar;--> statement-breakpoint

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  contacts — add missing fields                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE "contacts" ADD COLUMN "persona_linkedin" varchar;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "approve_status" varchar;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "first_name" varchar;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_3_ai" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_3_manual" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_4_ai" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_4_manual" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_5_ai" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hook_5_manual" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_modified" timestamp;--> statement-breakpoint

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  outreach — add missing fields, fix date types, update FKs                 ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE "outreach" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "persona_linkedin" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "full_name" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "title" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "lead_notes" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "response_subcategory" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "next_action_date" date;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "current_fu_step" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "chat_link" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "message_history" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "correspondence_extract" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "notes_before_call" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "initial_call_date" timestamp;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "initial_call_result" varchar;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "initial_call_notes" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "initial_call_transcript" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "last_touch_date" date;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "status_change_date" date;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint

-- Fix connected_date and replied_date: timestamp → date
ALTER TABLE "outreach" ALTER COLUMN "connected_date" SET DATA TYPE date USING "connected_date"::date;--> statement-breakpoint
ALTER TABLE "outreach" ALTER COLUMN "replied_date" SET DATA TYPE date USING "replied_date"::date;--> statement-breakpoint

-- Drop campaign FK (campaign is derived via contact, not direct)
ALTER TABLE "outreach" DROP CONSTRAINT IF EXISTS "outreach_campaign_id_campaigns_id_fk";--> statement-breakpoint
ALTER TABLE "outreach" DROP COLUMN IF EXISTS "campaign_id";--> statement-breakpoint

-- Add company FK
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
