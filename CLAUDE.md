# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CipherCross Internal Analytics Tool — a "Chat-with-Data" interface for a LinkedIn outreach pipeline. An AI assistant (Claude 3.5 Sonnet via Vercel AI SDK) answers analytical questions by running Drizzle queries against a PostgreSQL database synced from Airtable.

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
- **Clerk** — auth; `proxy.ts` runs `clerkMiddleware()` on all routes
- **Drizzle ORM** + **postgres** driver — schema in `db/schema.ts`, client singleton in `db/index.ts`
- **PostgreSQL** on Railway — connection via `DATABASE_URL`
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) + **Claude 3.5 Sonnet** — chat backend
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
  schema.ts          # 4 tables: companies, campaigns, contacts, outreach
  index.ts           # postgres client singleton + drizzle instance
drizzle/             # generated migration files
drizzle.config.ts    # points to db/schema.ts, reads DATABASE_URL
proxy.ts             # Clerk middleware
```

## Database schema

Four tables (all with `airtable_id` as the upsert key):

- **companies** — company profile data (industry, country, employees, ai_niche)
- **campaigns** — outreach campaigns with 3 message templates
- **contacts** — individual leads linked to company + campaign, with AI/manual hooks
- **outreach** — funnel tracking (stage, lead_status, connected/replied dates, response_category)

Foreign keys: `contacts → companies`, `contacts → campaigns`, `outreach → contacts`, `outreach → campaigns`.

## AI tools (in `/api/chat/route.ts`)

Three Drizzle-backed tools exposed to Claude:

- `getCampaignFunnel` — aggregates outreach counts by stage/lead_status, optionally filtered by campaign name
- `compareHookPerformance` — joins contacts + outreach to compare AI vs manual hook reply rates
- `getRecentResponses` — fetches recent replied outreach joined with contact + company data

## Data flow

Make.com → Airtable → `/api/sync` (daily cron + manual button) → PostgreSQL → Drizzle tools → Claude → Chat UI

## Environment variables

See `.env.local.example`. Required:

```
DATABASE_URL=          # Railway PostgreSQL
AIRTABLE_API_KEY=
AIRTABLE_LINKEDIN_BASE_ID=
CRON_SECRET=           # Authorization header for /api/sync
ANTHROPIC_API_KEY=
```
