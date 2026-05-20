# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CipherCross Internal Analytics Tool — a "Chat-with-Data" interface for LinkedIn and Upwork outreach pipelines. An AI assistant (Claude Opus 4.7 via Vercel AI SDK) answers analytical questions by running Drizzle queries against a PostgreSQL database synced from Airtable.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint

npm run db:generate  # generate Drizzle migrations from schema changes
npm run db:migrate   # apply migrations to the database
npm run db:push      # push schema directly (dev only, no migration files)
npm run db:studio    # open Drizzle Studio
```

## Stack

- **Next.js** (App Router, TypeScript, React Server Components)
- **Tailwind CSS v4** — config lives in `app/globals.css` via `@import "tailwindcss"`, no `tailwind.config.*`
- **Clerk** — auth; `middleware.ts` runs `clerkMiddleware()` on all routes
- **Drizzle ORM** + **postgres** driver — schema in `db/schema.ts`, client singleton in `db/index.ts`
- **PostgreSQL** on Railway — connection via `DATABASE_URL`
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) + **Claude Opus 4.7** — chat backend
- **Airtable** → PostgreSQL sync via `/api/sync` (triggered by Vercel Cron or UI button)

## Architecture

```
app/
  api/
    chat/route.ts    # streamText + Drizzle tools for Claude
    sync/route.ts    # Airtable → PostgreSQL upsert
  layout.tsx         # ClerkProvider + header auth buttons
  page.tsx           # Chat UI (useChat)
  globals.css
db/
  schema.ts          # 6 tables: public.{companies, campaigns, contacts, outreach} + upwork.{bids, outreach}
  index.ts           # postgres client singleton + drizzle instance
drizzle/             # generated migration files
drizzle.config.ts    # points to db/schema.ts, reads DATABASE_URL
middleware.ts        # Clerk middleware
```

## Database schema

All tables use `airtable_id` as the upsert key.

### `public` schema — LinkedIn pipeline

- **companies** — company profile data (industry, country, employees, ai_niche)
- **campaigns** — outreach campaigns with 3 message templates
- **contacts** — individual leads linked to company + campaign, with AI/manual hooks
- **outreach** — funnel tracking (outreach_status for funnel: Waiting/Active/Connected/Replied/Continued/Stopped; stage, lead_status, connected/replied dates, response_category)

Foreign keys: `contacts → companies`, `contacts → campaigns`, `outreach → contacts`, `outreach → campaigns`.

### `upwork` schema — Upwork pipeline

- **upwork.bids** — proposals/bids sent to Upwork jobs (job quality, bid status, job metadata, client stats, proposal tracking with view/reply dates, connects spent, boost info)
- **upwork.outreach** — CRM deal pipeline from first contact through estimate presentation (stage funnel: New → First contact → Negotiations → Call Booked → Estimating → Estimate presentation → Contract Signed / Lost; includes initial & second call tracking, estimate data, follow-up steps, lost reason)

No FK between the two Upwork tables (independent Airtable tables).

## AI tools (in `app/api/chat/tools/`)

Drizzle-backed tools exposed to Claude, split per channel and re-exported from `tools/index.ts`:

- `linkedin.tools.ts` — getCampaignFunnel, compareCampaigns, compareHookPerformance, getResponseBreakdown, getMessageSequenceEffectiveness, getOutreachTimeline, getIndustryPerformance, getGeographyPerformance, getLeadPipeline, getPipelineVelocity, getRecentResponses
- `upwork.tools.ts` — getUpworkBidsFunnel, getUpworkBidPerformance, getUpworkConnectsROI, getUpworkOutreachPipeline, getUpworkRecentActivity, getUpworkBidsTrend, getLostReasonBreakdown, getUpworkPipelineValue
- `cross-channel.tools.ts` — getCrossChannelSummary, getPeriodComparison
- `detail.tools.ts` — readLeadDetails (deep qualitative read of a single lead)
- `sql.tools.ts` — executeSQL (read-only ad-hoc SELECT/CTE escape hatch)

## Data flow

- **LinkedIn:** Make.com → Airtable (Web 2 Mob base) → `/api/sync` → PostgreSQL `public.*` tables
- **Upwork:** Make.com → Airtable (Upwork base) → `/api/sync` → PostgreSQL `upwork.*` tables
- Both synced via daily Vercel Cron + manual UI button → Drizzle tools → Claude → Chat UI

## Environment variables

See `.env.local.example`. Required:

```
DATABASE_URL=              # Railway PostgreSQL
AIRTABLE_API_KEY=
AIRTABLE_LINKEDIN_BASE_ID= # app4P6PbWSwEEmOIz
AIRTABLE_UPWORK_BASE_ID=   # appfQxws68Ptopf1C
CRON_SECRET=               # Authorization header for /api/sync
ANTHROPIC_API_KEY=
```
