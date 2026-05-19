# Upwork Airtable Schema

> **Base ID:** `appfQxws68Ptopf1C`
> **Source:** Airtable Metadata API — auto-generated reference

---

## Table of Contents

1. [Bids](#1-bids) — Proposals/bids sent to Upwork jobs
2. [Outreach](#2-outreach) — CRM deal pipeline from first contact through contract

---

## 1. Bids

> Proposals/bids sent to Upwork jobs — job metadata, client stats, proposal tracking with view/reply dates, connects spent, boost info.

**Table ID:** `tbl54MzKJHsvlHGqh`
**Primary field:** `uid`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| uid | `fldylmr5iaUzjhugk` | `singleLineText` | Unique identifier for the bid |
| Job Quality | `fldAPfzBveQUhhiwB` | `singleSelect` | Quality assessment of the job. Choices: `High quality`, `Low quality`, `No quality`, `No data` |
| Bid status | `fldTgJ1syRPFgaumi` | `singleSelect` | Current bid outcome. Choices: `Replied us`, `No replies`, `No longer available`, `=< 3 replies`, `> 3 replies`, `Hired another dev (without rate)`, `Hired at a lower rate`, `Hired at a higher rate` |
| Interviews | `fld74Bqx7fSLDnQ6D` | `number` (precision 0) | Number of interviews for the job |
| Job link | `fldE6Uz2dwHkgJxGZ` | `url` | Link to the Upwork job posting |
| Job title | `fldrnjhzYXL7zgj45` | `singleLineText` | Title of the job posting |
| Job status | `fldsPWWsS2FAkucE9` | `singleSelect` | Status of the job on Upwork. Choices: `SUBMITTED`, `ACTIVE`, `ARCHIVED`, `CLOSED` |
| Job Description | `fldWUh2wzhe2qer5D` | `multilineText` | Full job description |
| Job Created At | `fldwKp0StnsSh9YoF` | `dateTime` | When the job was posted (D/M/YYYY HH:mm, Europe/Kiev) |
| Client Country | `fldSrIqqSkCVCnTap` | `singleLineText` | Country of the client |
| Avg Hourly Rate | `fldoBc3GOJXgV0yDd` | `currency` ($, precision 2) | Client's average hourly rate on Upwork |
| Total Spent | `fldPvmiUvCAirSKHp` | `currency` ($, precision 0) | Client's total spend on Upwork |
| Total Hires | `fldwvalznghnbTesc` | `number` (precision 0) | Client's total number of hires |
| Hire Rate | `fldS9bumP557aKutN` | `percent` (precision 0) | Client's hire rate percentage |
| Feedback Count | `fld6gWUQSDidCWzLS` | `number` (precision 0) | Number of client feedbacks |
| Feedback Score | `fldkBG523254NXC2D` | `number` (precision 1) | Client's average feedback score |
| Profile | `fldiNrU3xDxZGScSM` | `singleLineText` | Upwork profile used for the bid |
| Search Name | `fldQxwGwW1u2GKUGQ` | `singleLineText` | Name of the search/filter that found this job |
| Proposal Sent | `fldTcBCyE2NKWtKEF` | `dateTime` | When the proposal was sent (D/M/YYYY HH:mm, Europe/Kiev) |
| Cover Letter | `fldA6QEEoN9rWbhTt` | `multilineText` | Cover letter text sent with the proposal |
| Boosted | `fldgKMH4WMIplYrIb` | `singleSelect` | Whether the proposal was boosted. Choices: `TRUE`, `FALSE` |
| Boost Outbid | `fldUuUWchF0G3UvKK` | `singleSelect` | Whether another bidder outbid the boost. Choices: `TRUE`, `FALSE` |
| Connects Spent | `fldLlGKYPlR52898k` | `number` (precision 0) | Number of Upwork connects spent |
| Manager Name | `fldzIyKvyNI9QlLQu` | `singleLineText` | Name of the manager who sent the bid |
| View Status | `fldavNGDmn8Req0Sn` | `singleSelect` | Whether the client viewed the proposal. Choices: `Viewed` |
| View Date | `fldtvxZYqqjOOb4j1` | `dateTime` | When the client viewed the proposal (D/M/YYYY HH:mm, Europe/Kiev) |
| Reply Status | `fldzAKGrY5N062Lzy` | `singleSelect` | Whether the client replied. Choices: `Replied` |
| Reply Date | `fldAxRIg7ld3Ct5Yh` | `dateTime` | When the client replied (D/M/YYYY HH:mm, Europe/Kiev) |
| Proposal Results | `fldazQshatY154OoL` | `formula` | Computed status: `Replied` → `Viewed` → `Sent`. Formula: `IF(Reply Status = "Replied", "Replied", IF(View Status = "Viewed", "Viewed", "Sent"))` |
| Budget | `fldQwFcCNUM4CE4MW` | `singleLineText` | Job budget / rate info |
| Created | `fldbQelHN8NMktcDw` | `createdTime` | Record creation date (D/M/YYYY HH:mm, Europe/Kiev) |
| Last Modified | `fldSlpXYscLuAB8lI` | `lastModifiedTime` | Last modification date (D/M/YYYY HH:mm, Europe/Kiev) |

**Views:** All Bids, All

---

## 2. Outreach

> CRM deal pipeline from first contact through estimate presentation to contract signing. Tracks calls, estimates, follow-ups, and lost reasons.

**Table ID:** `tblhNyehVWHtEMo0S`
**Primary field:** `uid`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| uid | `fldUwmjlHXjPfHUf1` | `singleLineText` | Unique identifier for the outreach record |
| Source Data | `fld3C79yEC3Io4dfN` | `singleSelect` | How the lead originated. Choices: `Bid`, `Invite`, `Direct`, `Consultation` |
| Job Quality | `fldsFqaZ9X6vhshCS` | `singleSelect` | Quality assessment of the job. Choices: `High quality`, `Low quality`, `No quality` |
| Stage | `fldV9l2yBrbjBbiRL` | `singleSelect` | Deal pipeline stage. Choices: `New`, `First contact`, `Negotiations`, `Call Booked`, `Estimating`, `Estimate presentation`, `Frozen / Later`, `Contract Signed`, `Lost (Client Reject)`, `Dropped (Internal)` |
| Client Name | `fldLQZZma39vfUyhk` | `singleLineText` | Name of the client |
| Profile | `fld1fPSvrhLzTKMOl` | `singleLineText` | Upwork profile used |
| Proposal Sent | `fldbAvYnpShfg0hQu` | `dateTime` | When the proposal was sent (D/M/YYYY HH:mm, Europe/Kiev) |
| Cover Letter | `fldKGqLmt6M55JE6U` | `multilineText` | Cover letter text |
| Initial Message | `fldTU1Zeu07d0p4vg` | `multilineText` | First message sent to the client |
| View Date | `fld05aKTjGBh0VsOU` | `dateTime` | When the client viewed the proposal (D/M/YYYY HH:mm, Europe/Kiev) |
| Reply Date | `fld4x9e11uja8cNrg` | `dateTime` | When the client replied (D/M/YYYY HH:mm, Europe/Kiev) |
| Job Title | `fldr4vZ869KYJQyPX` | `singleLineText` | Title of the job posting |
| Job Description | `fldwBCyyhfvhvaPsi` | `multilineText` | Full job description |
| Job Link | `fld2V9LbUpUEuAbVI` | `url` | Link to the Upwork job posting |
| Job Created At | `flddiAIYOMXAEvL2Y` | `dateTime` | When the job was posted (D/M/YYYY HH:mm, Europe/Kiev) |
| Client Country | `fldQD0KTRuuwz3WOi` | `singleLineText` | Country of the client |
| Total Spent | `fldNo4uiPUhYTqdXi` | `currency` ($, precision 0) | Client's total spend on Upwork |
| Avg Hourly Rate | `fldzG5txRJss03Em1` | `currency` ($, precision 2) | Client's average hourly rate |
| Total Hires | `fldCcx06FbUgh85sG` | `number` (precision 0) | Client's total number of hires |
| Hire Rate | `fld2TT28VlmupY0GL` | `percent` (precision 0) | Client's hire rate percentage |
| Feedback Count | `fldOj0apVJmjx2Ozx` | `number` (precision 0) | Number of client feedbacks |
| Feedback Score | `fldZELUfMnhF8IoQH` | `number` (precision 1) | Client's average feedback score |
| Chat Link | `fldBkckm20o3bNG1S` | `url` | Link to the Upwork message thread |
| Message History | `fldSDCioSlZYErFM3` | `richText` | Full message history |
| Correspondence Extract | `fldc49X6IcpltHo7y` | `richText` | Summary of correspondence |
| Next Action Date | `fld4FzGVIf207My9o` | `date` | Next scheduled follow-up (D/M/YYYY) |
| Current FU Step | `fldJ24czJhc6bY6c5` | `singleSelect` | Current follow-up step. Choices: `FU1`, `FU2`, `FU3`, `FU4`, `FU5`, `Break-up`, `Ping` |
| Tasks / Notes | `fldovR7ghrrfGeC0Q` | `multilineText` | Any tasks or notes related to the deal |
| Last Contact | `fldqQyv9ANL9UfeWg` | `dateTime` | Last interaction date (D/M/YYYY HH:mm, Europe/Kiev) |
| Notes before the call | `fldTvqxJ67WOeANpN` | `richText` | Pre-call preparation notes |
| Initial Call Status | `fld8UF4rVldGtgv1A` | `singleSelect` | Choices: `Not scheduled`, `Booked`, `Completed`, `No Show`, `Skipped`, `Customer canceled` |
| Initial Call Date | `fldfbIOVcxsYOmMQj` | `dateTime` | Date & time of the initial call (D/M/YYYY HH:mm, Europe/Lisbon) |
| Initial Call Result | `fldnaJwp147LqOpjG` | `singleSelect` | Choices: `Prepare Estimate`, `Discovery`, `Needs 2nd Call`, `Needs FU`, `Low Budget`, `Wrong Tech/Scope`, `Red Flags`, `Re-book`, `–` |
| Initial Call Notes | `fldMSxgJsRMqs5WFO` | `richText` | Notes from the initial call |
| Initial Call Transcript | `fldS4wGiH2khA2UNf` | `richText` | Transcript of the initial call |
| Second Call Status | `flddsvK5KtbGcwzph` | `singleSelect` | Choices: `Not scheduled`, `Booked`, `Completed`, `No Show`, `Skipped`, `Customer canceled` |
| Second Call Date | `fldaXukSO5VfwYxFy` | `dateTime` | Date & time of the second call (D/M/YYYY HH:mm, Europe/Lisbon) |
| Second Call Result | `fldKhmaOr4QZg2tgr` | `singleSelect` | Choices: `Prepare Estimate`, `Needs 2nd Call`, `Needs FU`, `Low Budget`, `Wrong Tech/Scope`, `Red Flags`, `Re-book`, `–` |
| Second Call Notes | `fldC8oKKpwQjLmTe6` | `richText` | Notes from the second call |
| Second Call Transcript | `fldUYRhehfWgbKb7E` | `richText` | Transcript of the second call |
| Estimate Link | `fldg4P4xox6vTWYRC` | `url` | Link to the estimate document |
| Estimate Amount | `fldva3MnVbP0uSlbV` | `currency` ($, precision 0) | Estimate amount in USD |
| Estimate Presentation Call Status | `fldOPTv0DSq5wICWm` | `singleSelect` | Choices: `Not scheduled`, `Booked`, `Completed`, `No Show`, `Skipped`, `Customer canceled` |
| Estimate Presentation Call Date | `fldZzTVlB6s8GTkOf` | `dateTime` | Date & time of the estimate presentation call (D/M/YYYY HH:mm, Europe/Lisbon) |
| Estimate Result | `fldUqZDga3gC487AY` | `singleSelect` | Outcome of the estimate presentation. Choices: `Successful`, `Waiting for a response`, `Needs editing`, `Not suitable`, `Re-book` |
| Estimate Presentation Notes | `fldqoHGoGPzOXSnmC` | `multilineText` | Notes from the estimate presentation |
| Actual Call | `fld0vhyEdhSiDoL6J` | `formula` | Shows the most relevant upcoming/recent call. Prioritizes Estimate Call → Second Call → Initial Call. Displays label + date formatted as DD/MM HH:mm |
| Missing Call Result | `fldMi9kSOOiCRByfq` | `formula` | Flags which call is past-due and still missing a result. Values: `Estimate Call Results`, `Second Call Results`, `Initial Call Results`, or blank |
| Lost Reason | `fld5tfG3WHSWpQUzi` | `singleSelect` | Why the deal was lost. Choices: `Price`, `Competitor`, `Tech Stack`, `Ghosted`, `We Dropped` |
| Lost Notes | `fldxLKJpQHce0W2Qd` | `multilineText` | Additional notes about why the deal was lost |
| Created | `fldOj6gHJaUUt9Jcu` | `createdTime` | Record creation date (D/M/YYYY HH:mm, Europe/Kiev) |
| Last Modified | `fld8Mo7h6aAD6J5GI` | `lastModifiedTime` | Last modification date (D/M/YYYY HH:mm, Europe/Kiev) |

**Views:** Full table, Add info, Active

---

## Relationships

```
Bids (standalone)       Outreach (standalone)
─────────────────       ────────────────────
No FK between tables — they are independent Airtable tables.

Bids    = proposal tracking (sent → viewed → replied)
Outreach = deal pipeline    (New → First contact → ... → Contract Signed / Lost)
```

**Key notes:**
- `Bids` tracks the proposal funnel: sent → viewed → replied, plus job & client metadata
- `Outreach` tracks the deal pipeline from first contact through calls, estimating, and contract signing
- There is **no foreign key** between Bids and Outreach — they are independent tables in Airtable
- Both tables share similar client/job metadata fields (country, spend, hire rate, feedback) but are not linked
