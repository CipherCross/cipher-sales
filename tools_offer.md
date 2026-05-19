# New Tools Proposal for AI Chat Analytics

## Current State

We have **3 tools**, all LinkedIn-only:

| # | Tool | What it answers |
|---|------|-----------------|
| 1 | `getCampaignFunnel` | Waiting → Active → Connected → Replied counts (optionally per campaign) |
| 2 | `compareHookPerformance` | AI vs manual hook reply-rate A/B test |
| 3 | `getRecentResponses` | Latest replies with contact/company context |

### Key Gaps

1. **Upwork is completely invisible** — the `upwork.bids` and `upwork.outreach` tables are never queried.
2. **No time-series analysis** — impossible to ask "how did reply rates trend this month?" or "which week had the most connects?"
3. **No dimensional breakdowns** — can't slice by industry, country, company size, seniority, or niche.
4. **No campaign comparison** — can compare hooks within a campaign, but can't rank campaigns against each other.
5. **No message-sequence insight** — `which_message_replied` data exists but is never aggregated.
6. **No pipeline / lead-stage visibility** — `lead_status`, `stage`, call fields all unused.
7. **No follow-up health** — `next_action_date`, `current_fu_step`, `last_touch_date` never surfaced.
8. **No cross-channel view** — can't compare LinkedIn vs Upwork performance.

---

## Proposed Tools

### A. LinkedIn — New Tools (7)

#### 4 · `compareCampaigns`

> *"Which campaigns have the best connect and reply rates?"*

- Ranks all campaigns (or a filtered subset by status) by connection rate and reply rate.
- Returns: campaign name, status, total contacts, connected count, replied count, connect %, reply %.
- Input: optional `status` filter (`Active`, `Paused`, etc.).
- **Schema used**: `campaigns` → `contacts` → `outreach`.

---

#### 5 · `getResponseBreakdown`

> *"What share of replies are Interested vs Soft No vs Hard No?"*

- Aggregates `response_category` (and optionally `response_subcategory`) counts.
- Filterable by campaign name, industry, or date range.
- Returns: category, subcategory, count, percentage of total replies.
- **Schema used**: `outreach` → `contacts` → `campaigns`, `companies`.

---

#### 6 · `getMessageSequenceEffectiveness`

> *"Do most people reply to message 1 or message 3?"*

- Groups replied outreach by `which_message_replied`.
- Filterable by campaign.
- Returns: message number, reply count, share %.
- **Schema used**: `outreach` (+ optional campaign join).

---

#### 7 · `getOutreachTimeline`

> *"Show me weekly reply and connection trends for the last 3 months."*

- Time-bucketed (day / week / month) counts of connections (`connected_date`) and replies (`replied_date`).
- Input: granularity (`day` | `week` | `month`), optional date range, optional campaign filter.
- Returns: period label, connections, replies.
- **Schema used**: `outreach` → `contacts` → `campaigns`.

---

#### 8 · `getIndustryPerformance`

> *"Which industries have the highest reply rates?"*

- Groups outreach by `companies.industry` (or `companies.ai_niche`).
- Returns: industry/niche, total outreach, connected, replied, connect %, reply %.
- Input: dimension (`industry` | `aiNiche`), optional minimum sample size to filter noise.
- **Schema used**: `outreach` → `companies`.

---

#### 9 · `getGeographyPerformance`

> *"How does reply rate compare across US, UK, Germany?"*

- Groups outreach by `companies.hq_country`.
- Returns: country, total, connected, replied, connect %, reply %.
- Input: optional top-N limit, optional campaign filter.
- **Schema used**: `outreach` → `companies`.

---

#### 10 · `getLeadPipeline`

> *"How many leads are in each stage? Who has an overdue follow-up?"*

- Two modes:
  - **Summary**: counts by `lead_status` and/or `stage`.
  - **Overdue**: records where `next_action_date < today`, joined with contact/company info.
- Input: mode (`summary` | `overdue`), optional stage filter.
- **Schema used**: `outreach` → `contacts` → `companies`.

---

### B. Upwork — New Tools (5)

#### 11 · `getUpworkBidsFunnel`

> *"How many Upwork proposals were viewed, replied to, and resulted in interviews?"*

- Aggregates bids by `bid_status` and `view_status` / `reply_status`.
- Returns: status, count, and overall conversion percentages (sent → viewed → replied → interview).
- Input: optional `profile` filter, optional date range on `proposal_sent`.
- **Schema used**: `upwork.bids`.

---

#### 12 · `getUpworkBidPerformance`

> *"Which Upwork profile gets the best reply rate? Does boosting help?"*

- Groups bids by a chosen dimension: `profile`, `search_name`, `manager_name`, `job_quality`, `boosted`, `client_country`.
- Returns: dimension value, bids sent, views, replies, interviews, view %, reply %, avg connects spent.
- Input: `groupBy` dimension, optional date range.
- **Schema used**: `upwork.bids`.

---

#### 13 · `getUpworkConnectsROI`

> *"How many connects am I spending per reply? Per interview?"*

- Computes total connects spent, total bids, total replies, total interviews.
- Derives: connects/reply, connects/interview.
- Filterable by profile, date range, boosted vs organic.
- **Schema used**: `upwork.bids`.

---

#### 14 · `getUpworkOutreachPipeline`

> *"What does the Upwork direct-outreach sales pipeline look like?"*

- Full pipeline funnel: total → viewed → replied → initial call booked → initial call completed → second call → estimate sent → estimate won.
- Input: optional `profile` filter, optional `stage` filter, optional date range.
- Returns: stage, count, conversion from previous stage %.
- **Schema used**: `upwork.outreach`.

---

#### 15 · `getUpworkRecentActivity`

> *"Show me recent Upwork replies and upcoming follow-ups."*

- Two modes:
  - **Recent replies**: latest bids or outreach with reply dates, with job/client context.
  - **Upcoming follow-ups**: outreach where `next_action_date` is within the next N days.
- Input: mode (`replies` | `followups`), `source` (`bids` | `outreach`), limit, days-ahead (for followups).
- **Schema used**: `upwork.bids` or `upwork.outreach`.

---

### C. Cross-Channel (1)

#### 16 · `getCrossChannelSummary`

> *"Give me a combined view of LinkedIn and Upwork this month."*

- Returns a unified summary object:
  - **LinkedIn**: total outreach, connected, replied, reply rate, top response category, # overdue follow-ups.
  - **Upwork Bids**: total sent, viewed, replied, interviews, reply rate, avg connects/reply.
  - **Upwork Outreach**: total sent, replied, calls booked, estimates sent, estimates won.
- Input: optional date range (applies to `start_date`/`proposal_sent`/`created_at`).
- **Schema used**: `outreach`, `upwork.bids`, `upwork.outreach`.

---

## Summary Matrix

| #  | Tool | Channel | Primary Question |
|----|------|---------|-----------------|
| 4  | `compareCampaigns` | LinkedIn | Which campaigns perform best? |
| 5  | `getResponseBreakdown` | LinkedIn | What types of replies are we getting? |
| 6  | `getMessageSequenceEffectiveness` | LinkedIn | Which message in the sequence converts? |
| 7  | `getOutreachTimeline` | LinkedIn | How are metrics trending over time? |
| 8  | `getIndustryPerformance` | LinkedIn | Which industries respond best? |
| 9  | `getGeographyPerformance` | LinkedIn | Which countries respond best? |
| 10 | `getLeadPipeline` | LinkedIn | What does the active pipeline look like? |
| 11 | `getUpworkBidsFunnel` | Upwork | What's the bids conversion funnel? |
| 12 | `getUpworkBidPerformance` | Upwork | Which profile/search/boost strategy works? |
| 13 | `getUpworkConnectsROI` | Upwork | Are we spending connects efficiently? |
| 14 | `getUpworkOutreachPipeline` | Upwork | What does the direct-outreach pipeline look like? |
| 15 | `getUpworkRecentActivity` | Upwork | What happened recently & what's coming up? |
| 16 | `getCrossChannelSummary` | Both | How are all channels performing together? |

---

## Implementation Priority

### P0 — Highest impact, simplest to build
These tools fill the most critical blind spots and are straightforward aggregations:

- **`compareCampaigns`** (#4) — the single most requested question a CEO asks.
- **`getResponseBreakdown`** (#5) — the data exists and is never surfaced.
- **`getUpworkBidsFunnel`** (#11) — Upwork is completely invisible today.
- **`getCrossChannelSummary`** (#16) — enables "give me the big picture" in one call.

### P1 — High insight, moderate complexity
- **`getMessageSequenceEffectiveness`** (#6)
- **`getOutreachTimeline`** (#7) — requires `DATE_TRUNC` expressions.
- **`getUpworkBidPerformance`** (#12)
- **`getLeadPipeline`** (#10)

### P2 — Valuable for deep dives
- **`getIndustryPerformance`** (#8)
- **`getGeographyPerformance`** (#9)
- **`getUpworkConnectsROI`** (#13)
- **`getUpworkOutreachPipeline`** (#14)
- **`getUpworkRecentActivity`** (#15)

---

## Notes

- **System prompt update**: should be expanded to mention Upwork so the model knows it can answer questions about both channels.
- **`stepCountIs(5)`** is fine — most analytical questions require 1–2 tool calls; cross-channel might need 3.
- All new tools are **read-only** — no writes, no mutations, safe for production.
