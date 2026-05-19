# LinkedIn Airtable Schema

> **Base ID:** `app4P6PbWSwEEmOIz`
> **Source:** Airtable Metadata API — auto-generated reference

---

## Table of Contents

1. [DB](#1-db) — Raw company database (pre-approval)
2. [Companies](#2-companies) — Approved companies for outreach
3. [Contacts](#3-contacts) — Individual leads linked to companies & campaigns
4. [Outreach](#4-outreach) — Funnel tracking per lead
5. [Linked Helper](#5-linked-helper) — Export table for LinkedIn automation tool
6. [Campaigns](#6-campaigns) — Outreach campaign templates

---

## 1. DB

> Raw company database — companies that have passed or failed the verification process.

**Table ID:** `tblEYOgRDRg0aYfzI`
**Primary field:** `Company Website`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| Company Website | `fldOtfQ8mk0W0quRi` | `url` | Full working link to the company's website without any path component (.com/something) |
| Added to Companies | `fldguxuyDXVp3BqkK` | `singleSelect` | Check whether the approved company has been added to the Companies list. Choices: `Added`, `Not added` |
| Initial status | `fldvNEA1HtWxMUVGW` | `singleSelect` | Status assigned after verification. Choices: `New`, `Manual review`, `Approve`, `Rejected`, `Old` |
| Site is operational | `fldURf74INVascSVq` | `singleSelect` | Whether the website is working. Choices: `TRUE`, `FALSE`. *Auto-filled* |
| Web App (script) | `fldK1740Ujv1cUz2S` | `singleSelect` | Whether the script found a Web App. Choices: `TRUE`, `NOT SURE`, `FALSE`. *Auto-filled* |
| Web App (AI) | `fldT6gZxhhO0AYj9U` | `singleSelect` | Whether AI found a Web App. Choices: `TRUE`, `NOT SURE`, `FALSE`. *Auto-filled* |
| Company name | `fldk8Ah5DzqNdC9Lw` | `singleLineText` | Full company name from Apollo or LinkedIn |
| Company name for mailing | `flda4VsftBlL1kbvy` | `singleLineText` | Edited company name for outreach (e.g. "CipherCross, ltd." → "CipherCross") |
| LinkedIn URL | `fldPbtYqIJ8B2XP4O` | `url` | Full working link to the company's LinkedIn page |
| Web App Link | `fldOWrhyzeHoMmnl6` | `url` | Link to the company's Web App/SaaS |
| HQ country | `fldSpGDwW6tHBCEv7` | `singleLineText` | Country of the company's headquarters |
| Founded year | `fldntEDvhQv7gZKXk` | `number` (precision 0) | Year founded (YYYY format) |
| Employees | `fldHMWH6nF9SwnJgL` | `number` (precision 0) | Total number of employees |
| Industry | `fld0q8PFtHszKqXIc` | `singleLineText` | Industry category from Apollo |
| Keywords | `fldaN1Aj5VIEMf5vo` | `multilineText` | Keywords for the company from Apollo |
| Description | `fldN4Gf1ee5iVG0Xs` | `multilineText` | Brief description from Apollo or LinkedIn |
| AI Site info | `fldNpJOkyfiFbKSO1` | `multilineText` | AI-generated description based on website. *Auto-filled* |
| AI Niche | `fldjYxyz9snmXXkmc` | `singleLineText` | AI-generated specific niche. *Auto-filled* |
| Created | `fldcNuYZ5Y31YaOma` | `createdTime` | Record creation date (D/M/YYYY) |
| Last Modified | `fldNrwSMFh4LErk7e` | `lastModifiedTime` | Last modification date (D/M/YYYY) |

**Views:** Full Companies DB, Not Added To Companies, http

---

## 2. Companies

> Approved companies for outreach pipeline.

**Table ID:** `tblDk8o4Nb4mFAEa8`
**Primary field:** `Company name`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| Company name | `fldxi1YhTYAOPaWSR` | `singleLineText` | Full company name from Apollo or LinkedIn |
| Approve Status | `flddoWKMzEJeWtawn` | `singleSelect` | Choices: `New`, `Approved`, `Rejected`, `Edits` |
| Company name for mailing | `fld2lNvsLo7MV6IMt` | `singleLineText` | Edited company name for outreach |
| Website URL | `fldQxdTVpDHxJRETw` | `url` | Full working link to the company's website |
| LinkedIn URL | `fld0JvyDrKHUhoWHF` | `url` | Full working link to the company's LinkedIn page |
| Web App Link | `fldvX2IPur7no726y` | `url` | Link to the company's Web App/SaaS |
| HQ country | `fldHe49wbgS40WHz5` | `singleLineText` | Country of the company's headquarters |
| Founded year | `fldPOYh7FRnyDwqiI` | `number` (precision 0) | Year founded (YYYY format) |
| Employees | `fldHDIqyh9WEWkcjX` | `number` (precision 0) | Total number of employees |
| Industry | `fldoSQBNXOcapI0Eq` | `singleLineText` | Industry category from Apollo |
| Keywords | `fldeb7TLWVT9cStYH` | `multilineText` | Keywords from Apollo |
| Description | `fldvtC5bj1UAv4d8u` | `richText` | Brief description from Apollo or LinkedIn |
| AI Site info | `fldQlJPHUC2c2aDqT` | `multilineText` | AI-generated description. *Auto-filled* |
| AI Niche | `fldiHnuwcPHL89TUM` | `singleLineText` | AI-generated niche. *Auto-filled* |
| Contacts | `fld0x8flL6XF7vK4K` | `multipleRecordLinks` | → **Contacts** table. *Auto-filled* |
| Outreach | `fld5qSz46qpWC3dIq` | `multipleRecordLinks` | → **Outreach** table. *Auto-filled* |
| Created | `fldiPxrDIQKJJ0tSe` | `createdTime` | Record creation date (D/M/YYYY) |
| Last Modified | `fldoedDXXAxBY3s8y` | `lastModifiedTime` | Last modification date (D/M/YYYY) |

**Views:** Companies, New Companies, Approved Companies, Rejected Companies

---

## 3. Contacts

> Individual leads linked to companies and campaigns.

**Table ID:** `tbl87CQnAjpKigu7i`
**Primary field:** `Persona LinkedIn`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| Persona LinkedIn | `fldK74NyJu8IyzF3p` | `url` | Clean link to the lead's LinkedIn page |
| Approve status | `fldvZ9g6nKmVVzcGb` | `singleSelect` | Choices: `New`, `Approved`, `Rejected`, `Edits` |
| Readiness status | `fldQwtYeVxZB5QhBo` | `singleSelect` | Lead preparation status. Choices: `To Personalize`, `Ready to review`, `Ready to approve`, `Edits`, `Ready to sending`, `Added to Outreach` |
| Full name | `fld29jxXQLiJn9XGh` | `singleLineText` | Lead's full name from LinkedIn |
| First name | `fldo5aVpTLrBFAcjG` | `singleLineText` | Edited first name for outreach (e.g. "Dr. Amîna James" → "Amina") |
| Title | `fldNiybN18Z7uINN7` | `singleLineText` | Lead's position in the company |
| Company | `fldlqGy5MwA3vOlDD` | `multipleRecordLinks` | → **Companies** table (single link) |
| Company Approve Status | `fldUfmCP0AZk6QhWf` | `lookup` | Lookup from Companies → Approve Status |
| Company name for mailing (from Company) | `fldjtlPSSQKIUi8Jr` | `lookup` | Lookup from Companies → Company name for mailing |
| Campaign Name (from Outreach) | `fldkhoLl8Ix9yeRA1` | `multipleRecordLinks` | → **Campaigns** table (single link) |
| hook_1_AI | `fldVBjhcS0wnkDWwq` | `singleLineText` | AI-generated personalization. *Auto-filled* |
| hook_1_manual | `fldv4akXcBJatSF9X` | `singleLineText` | Manual personalization override |
| hook_1 | `fldNpBMPbDh2edcSj` | `formula` | Final hook: manual if present, else AI. `IF(hook_1_manual, hook_1_manual, hook_1_AI)` |
| hook_2_AI | `fld85nvXnCfG7h9C8` | `singleLineText` | AI-generated personalization. *Auto-filled* |
| hook_2_manual | `fldAY2OEFIZgmM3ZL` | `singleLineText` | Manual personalization override |
| hook_2 | `fldXTMKsmdtKoyLpQ` | `formula` | Final hook: manual if present, else AI |
| hook_3_AI | `fldiOes0KHjm3VZ2U` | `singleLineText` | AI-generated personalization. *Auto-filled* |
| hook_3_manual | `fldrAb9FQIe0xEW8F` | `singleLineText` | Manual personalization override |
| hook_3 | `fld8CgpPrVVt3tejV` | `formula` | Final hook: manual if present, else AI |
| hook_4_AI | `fld7xLVGErfauD2BL` | `singleLineText` | AI-generated personalization. *Auto-filled* |
| hook_4_manual | `fldYRAo6FzAqtxZfM` | `singleLineText` | Manual personalization override |
| hook_4 | `fldNq9vt497VmVnDf` | `formula` | Final hook: manual if present, else AI |
| hook_5_AI | `fldasY1hIn6O5P6m9` | `singleLineText` | AI-generated personalization. *Auto-filled* |
| hook_5_manual | `fld5TwJq3Vi387xNk` | `singleLineText` | Manual personalization override |
| hook_5 | `fld1RjUAGBJNLuRD6` | `formula` | Final hook: manual if present, else AI |
| Created | `fldXIpzXwDmPGLj8k` | `createdTime` | Record creation date (D/M/YYYY) |
| Last Modified | `fldjGKUzq3WNLUQUM` | `lastModifiedTime` | Last modification date (D/M/YYYY) |
| Outreach | `fldwhqqil7MrVwUo5` | `multipleRecordLinks` | → **Outreach** table |
| Linked Helper | `fldzlTmU1RlhUWtEw` | `multipleRecordLinks` | → **Linked Helper** table |
| Template Message 1 | `fldl7XHfxpBVfJe2H` | `lookup` | Lookup from Campaigns → Message 1 |
| Message 1 Preview | `fldVgYO9CA15loZxe` | `formula` | Template with placeholders resolved (firstName, company, hooks) |
| Template Message 2 | `fldw5L9rNCP0bVej9` | `lookup` | Lookup from Campaigns → Message 2 |
| Message 2 Preview | `fldbxfjHpUJpVCs3w` | `formula` | Template with placeholders resolved |
| Template Message 3 | `fldxNY9vAacVSIIpm` | `lookup` | Lookup from Campaigns → Message 3 |
| Message 3 Preview | `fldwHKBsMOxrxJPaO` | `formula` | Template with placeholders resolved |
| Template Message 4 | `fldNAWigiwnT4gjyr` | `lookup` | Lookup from Campaigns → Message 4 |
| Message 4 Preview | `fldyUWeQV4wqoMF8E` | `formula` | Template with placeholders resolved |
| Template Message 5 | `fld4V4oyVLoaXircz` | `lookup` | Lookup from Campaigns → Message 5 |
| Message 5 Preview | `fldQLjUI3QG051a6z` | `formula` | Template with placeholders resolved |
| Personalization generation | `fldegNcNPcjDTqW2C` | `lookup` | Lookup from Campaigns → Personalization generation flag |

**Views:** Leads, Approved Leads

---

## 4. Outreach

> Funnel tracking per outreached lead — statuses, dates, responses, calls.

**Table ID:** `tbltqZUe1sAbVZVk1`
**Primary field:** `Persona LinkedIn`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| Persona LinkedIn | `fld5wsnwBEsxRqwkU` | `url` | Auto-filled from Contacts |
| Stage | `fldUx51BXr48waoZH` | `singleSelect` | Choices: `New`, `First contact`, `Negotiations`, `Call`, `Lost (Client Reject)`, `Dropped (Internal)` |
| Lead Status | `fldZL81oRzptunBpF` | `singleSelect` | Choices: `SQL`, `MQL`, `No QL` |
| Full Name | `fldnQHXirehUFByZ4` | `singleLineText` | Auto-filled from Contacts |
| Title | `fldSnJoKzTKMRVA8O` | `singleLineText` | Auto-filled from Contacts |
| Company | `fldUjiz84koSBSBGu` | `multipleRecordLinks` | → **Companies** table (single link) |
| Original Lead Data | `fldjNjHB3OaHXUKwR` | `multipleRecordLinks` | → **Contacts** table (single link) |
| Lead Notes | `fld9d586IS3GM9nRD` | `multilineText` | Any notes related to the lead |
| Campaign Name | `fldUIqR7Cp4LSvEHC` | `lookup` | Lookup from Contacts → Campaign link |
| Outreach Status | `flda3nlEE99gOAYeV` | `singleSelect` | Choices: `Waiting`, `Active`, `Connected`, `Replied`, `Continued`, `No Response`, `Stopped` |
| Connected Date | `fldkffPnesJFEbXzl` | `date` | Date of Connection Request acceptance (D/M/YYYY) |
| Replied Date | `fldnBda4BHkOZjF4h` | `date` | Date of lead's first contact with us (D/M/YYYY) |
| Which message replied | `fldYRUKKvgsHSu6Ed` | `singleSelect` | Choices: `CR`, `1st`, `2nd`, `3rd` |
| Response Category | `fldG38ChwKQyVUnKo` | `singleSelect` | Choices: `Interested`, `Later`, `Soft No`, `Hard No`, `Technical` |
| Response Sub-category | `fldpcEKGwbN3vHBoz` | `singleSelect` | Detailed response breakdown — see choices below |
| Next Action Date | `fldYDOHU9BjfciQxb` | `date` | Next scheduled follow-up (D/M/YYYY) |
| Current FU Step | `fldETEGUqXaJKGy23` | `singleSelect` | Choices: `FU1`, `FU2`, `FU3`, `FU4`, `FU5`, `Ping` |
| Chat link | `fldhO15r7HPx0ld2W` | `url` | Link to the LinkedIn conversation |
| Message History | `fldT3s91jW4bGeQVY` | `richText` | Full message history |
| Correspondence Extract | `fldSqAtgBA7lgau1r` | `richText` | Summary of correspondence |
| Notes before the call | `fldt79xF7i3eCQtjj` | `richText` | Pre-call preparation notes |
| Initial Call Status | `fldIYuNoUHWiepM02` | `singleSelect` | Choices: `Not scheduled`, `Booked`, `Completed`, `No Show`, `Skipped`, `Customer canceled` |
| Initial Call Date | `fldHeZPFj5N6vQhR1` | `dateTime` | Date & time (D/M/YYYY HH:mm, Europe/Kiev) |
| Initial Call Result | `fldUveCOA6mkfwd6j` | `singleSelect` | Choices: `Prepare Estimate`, `Discovery`, `Needs 2nd Call`, `Needs FU`, `Low Budget`, `Wrong Tech/Scope`, `Red Flags`, `Wrong person`, `Re-book`, `Just welcome`, `–` |
| Initial Call Notes | `fldB3N6tgVRz8jBt6` | `richText` | Notes from the initial call |
| Initial Call Transcript | `fldbyo319oeGtf1Ut` | `richText` | Transcript of the initial call |
| Date Added | `fldzLIWHVUqpiQ4JF` | `createdTime` | Record creation date (D/M/YYYY) |
| Start Date | `fldEuFYnYnL0ZowlO` | `date` | Date the outreach campaign started for this lead |
| Days From Start | `fldArgO1csj86Lop8` | `formula` | `DATETIME_DIFF(TODAY(), Start Date, 'days') & " days from start"` |
| Last Touch Date | `fld4fshKigev8oyeM` | `date` | Last interaction date (D/M/YYYY) |
| Status Change Date | `fldNZqrZBr5BOReK1` | `date` | Date of last status change (D/M/YYYY) |

### Response Sub-category Choices

| Category | Sub-category | Color |
|---|---|---|
| **Interested** | Interested / Demo | green |
| | Request Info | green |
| | Referral (Internal) | green |
| **Later** | Future Interest (Later) | cyan |
| | Busy / Out of Office | cyan |
| | Evaluating Rivals | cyan |
| **Soft No** | No Budget | yellow |
| | In-house only | yellow |
| | Already have a partner | yellow |
| | Not a fit | yellow |
| **Hard No** | Hard Refusal | red |
| | Wrong Person | red |
| | Stop / Unsubscribe | red |
| **Technical** | Auto-reply | purple |
| | Neutral / Question | purple |

**Views:** Outreached Leads, Campaign empty, Lead Status

---

## 5. Linked Helper

> Export table for the LinkedIn automation tool (Linked Helper).

**Table ID:** `tbldAOWOLIwAOFVU8`
**Primary field:** `ln_url`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| ln_url | `fldcHfx04eB6Z7TxP` | `url` | LinkedIn URL of the lead |
| Status | `fld95PNNBbJ7H2Qpr` | `singleSelect` | Choices: `Waiting for unloading`, `Loaded in LH` |
| Original Lead Data | `fld50Nlg60oCobpHj` | `multipleRecordLinks` | → **Contacts** table (single link) |
| Campaign Name | `fldpAYfXr8lUZVEd1` | `lookup` | Lookup from Contacts → Campaign link |
| first_name | `fld7etjljUCjzxTZS` | `singleLineText` | First name for LH template |
| company_name | `fldVNNBKnNcEx0OaC` | `singleLineText` | Company name for LH template |
| hook_1 | `fldNSytKbkBb0nvMS` | `singleLineText` | Personalization hook 1 |
| hook_2 | `fldBVrnn0O9pg191a` | `singleLineText` | Personalization hook 2 |
| hook_3 | `fldZ2aXQtDxi15iIG` | `singleLineText` | Personalization hook 3 |
| hook_4 | `fldf9cbMReoZz6xDt` | `singleLineText` | Personalization hook 4 |
| hook_5 | `fldDqun620kzPxkoL` | `singleLineText` | Personalization hook 5 |

**Views:** List of leads for export, #1–#4 Ready for export

---

## 6. Campaigns

> Outreach campaign definitions with message templates.

**Table ID:** `tblUdKPVJZumPVacj`
**Primary field:** `Campaign Name`

| Field Name | Field ID | Type | Description |
|---|---|---|---|
| Campaign Name | `fldkuZ255ZQVrirRv` | `singleLineText` | Name of the campaign |
| Status | `fldujMLAAlmkDIQj2` | `singleSelect` | Choices: `Draft`, `Running`, `Stopped` |
| Contacts | `fldZSiKh6XVVNpC4d` | `multipleRecordLinks` | → **Contacts** table |
| Message 1 | `fld2pTgqd4mNZ7blG` | `multilineText` | Template for message 1 (supports `{{firstName}}`, `{{company}}`, `{{hook_N}}` placeholders) |
| Message 2 | `fldL4UQAB6V6u9hPL` | `multilineText` | Template for message 2 |
| Message 3 | `fldwQEwxmOdxU2rZ4` | `multilineText` | Template for message 3 |
| Message 4 | `fldn8iRl1ZNe8qekC` | `multilineText` | Template for message 4 |
| Message 5 | `fldyetuddc3tDNHbn` | `multilineText` | Template for message 5 |
| Personalization generation | `fldhlDaXJYJnl5xB7` | `singleSelect` | Whether to generate AI personalization. Choices: `TRUE`, `FALSE` |

**Views:** Grid view

---

## Relationships Diagram

```
Campaigns ──┐
             ├──< Contacts ──< Outreach
Companies ──┘        │
                     ├──> Linked Helper
                     └──> Campaigns (via Campaign Name link)

DB (raw companies) ──[manual/automation]──> Companies
```

**Key relationships:**
- `Contacts.Company` → `Companies` (many-to-one)
- `Contacts.Campaign Name (from Outreach)` → `Campaigns` (many-to-one)
- `Outreach.Original Lead Data` → `Contacts` (many-to-one)
- `Outreach.Company` → `Companies` (many-to-one)
- `Linked Helper.Original Lead Data` → `Contacts` (many-to-one)
- `Campaigns.Contacts` → `Contacts` (one-to-many)
- `Companies.Contacts` → `Contacts` (one-to-many)
- `Companies.Outreach` → `Outreach` (one-to-many)
