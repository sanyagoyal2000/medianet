# 05 · Screens and user journeys

Every journey must work end to end, clicking through the real UI, in both live and cached modes.

## Routes
```
/overview                         J8   (/ redirects here)
/campaigns                        list + "Create campaign"
/campaigns/[id]?tab=brief|targeting|placements|performance   J1
/context-library                  J2
/traffic                          J3
/decisions/[requestId]            J4   (/decisions → latest)
/ai-channels?tab=sponsored|licensed   J5
/reports?tab=performance|quality|experiments|traffic   J6
/settings
/shopbuddy                        partner demo app (own layout, neutral branding)
```

## API routes (all `runtime = "nodejs"`)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/profile` `{url}` or `{pageId}` | fetch + readability + Context Profiler |
| POST | `/api/brief/interpret` | SSE |
| GET | `/api/eligibility?campaignId&mode=context_studio\|today` | |
| GET | `/api/forecast?campaignId` | |
| POST | `/api/explain` `{pageId, campaignId}` | |
| POST | `/api/campaigns`, PATCH `/api/campaigns/[id]` | save draft / review |
| POST | `/api/corrections`, `/api/corrections/[id]/resolve` | |
| POST | `/api/requests/simulate` `{kind}` | build a realistic request + headers → router → store → return requestId |
| GET | `/api/requests`, `/api/decisions/[requestId]` | |
| POST | `/api/v1/ai-placements`, `/api/v1/ai-placements/display`, `/api/v1/ai-placements/click` | |
| POST | `/api/shopbuddy/chat` | partner assistant + placement call |
| GET | `/api/agent-runs` | |
| POST | `/api/admin/reset` | |
| GET/POST | `/api/mcp` | MCP Streamable HTTP |

---

## J8 · Overview (`01_Overview.png`)
- **Header:** "Overview" + subtitle; actions **Inspect request** (outline) and **Create campaign** (primary).
- **KPI row:**
  - Active campaigns 24
  - Fresh context coverage 91.2%
  - Requests assessed 1,000,000
  - Unknown requests 5.0%
- **Contextual delivery card:** a table of context type / share / trend, plus a small line chart.
- **Request purpose card:** a horizontal stacked bar (human-facing / known automation / unknown) with a legend.
- **Recent delivery decisions:** a table with an Inspect link per row → J4.
- **Tasks awaiting review:**
  - "2 pages need review" → J2, filtered
  - "1 campaign draft from agent" → J1
  - "Unknown requests to review" → J3
- **AI channels card:** the funnel numbers plus a link to J5.

## J1 · Plan a campaign from a brief (`02_Campaign_Targeting.png`)
**Breadcrumb:** Campaigns › Holiday Gifting 2026. Tabs: Brief, Targeting, Placements, Performance.

1. **Brief tab:**
   - Advertiser (Kohl's), a brief textarea (prefilled), budget and flight (display only).
   - **Interpret brief** opens the `AgentStepsStream` live.
   - When it finishes, switch to the Targeting tab with the fields filled and a toast: "Targeting rules drafted from brief · review before saving".
2. **Targeting tab, left column (Targeting rules card):**
   - Topic (select)
   - Purpose (multi-select: Buying guide, Product comparison)
   - Tone preference (Upbeat, Practical), with the helper text "Preference only; exclusions always apply"
   - Hard restrictions: removable chips (Product recalls, Tragedy) + add
   - Country (United States)
   - Partner tier max
3. **Placement eligibility card:**
   - Table of Page / Purpose / Tone / Outcome pills.
   - "Estimated opportunities **2.4M** · Next 7 days · Historical estimate, not guaranteed delivery".
   - Expanding a row shows "Why this matches" (green checks) and "Evidence from content" (`EvidenceQuote`).
   - A **Compare: Today (topic only)** toggle re-queries with `mode=today`. Rows whose outcome changes get a "changed" badge; the recall page becomes Eligible.
4. **Right column, Context profile card:**
   - Chips: Fresh, "Content classified 2h ago", "Semantic similarity enabled".
   - Topic / purpose / tone of the selected row.
5. **Ad preview card:**
   - A Kohl's holiday-gifts creative (built with CSS/SVG: product tiles, a "Shop gifts" button).
   - A **Why this ad?** link opens a popover with the reader reason from the Explainer, plus a "Paid placement" note.
6. **Footer bar:**
   - "Agent access: **Connected** · Read & draft only · View activity" (→ Settings › Agent runs, filtered).
   - **Save draft** (outline) and **Review campaign** (primary). Review sets the status to `in_review` and shows a toast "Sent to Deals Desk as draft request DR-…".
7. The **Campaigns list** shows the status, the source (UI / MCP) and updatedAt. **Create campaign** opens a new campaign on the Brief tab with an empty brief.

## J2 · Context Library (`03_Context_Library.png`)
- **KPIs:** Fresh 91.2% / Needs review 2 / Stale 6.1% / Unclassified 2.7%.
- **Filters:** search, Site, Purpose, Status. **Buttons:** Add content source (primary), Reclassify selected.
- **Table:** checkbox, Page, Site, Topic, Purpose, Tone, Confidence, Status, Classified.
- **Add content source:**
  - A dialog takes a URL. Submitting calls `/api/profile`: progress steps (Fetching page → Extracting text → Profiling with Claude → Checking evidence), then the new row appears selected.
  - If the fetch fails (paywall / blocked), offer "Paste text instead".
- **Page profile panel (right), for the selected row:**
  - Topic (from ContextGraph, locked)
  - Purpose and Tone selects with a lock icon and "Review gated": changing them opens **Request correction**
  - Confidence bar
  - Evidence excerpts
  - Collapsible "Semantic representation": top TF-IDF terms + a fake 8-dimension vector preview, labelled "illustrative"
  - Campaign eligibility: "Kohl's Holiday Gifting · Eligible · No hard exclusion detected · Inspect decision"
  - Stepper "User path: classification flow": List › Evidence › Correction › Decision
- **Request correction dialog:** field, new value, note. It creates a correction, sets the status to "Needs review" and increments the KPI.
- **Reclassify selected:** re-runs the profiler on the checked rows, with a progress indicator.

## J3 · Traffic Intelligence (`04_Traffic_Intelligence.png`)
- **KPIs:** Requests assessed 1,000,000 · Human-facing 840,000 (84.0%) · Known automation 110,000 (11.0%) · Unknown 50,000 (5.0%).
- **Stacked bar chart** by day (Recharts).
- **Automation breakdown** table, with the note "Identity, request purpose and audience exposure are assessed separately."
- **Request activity** table (Request, Time, Source, Purpose, Confidence, Decision, Inspect).
- **Cards:**
  - "Unknown does not mean human" + **Review unknown requests**: a sheet listing unknown requests, each with Confirm unknown / Reclassify as… (human-facing requires a reason note)
  - "Billing reconciliation": billable = human-facing displayed + AI displays confirmed; automation and unknown excluded
- **Routing policies:** opens the routing table (read-only).
- **Inspect request:** opens a dialog to simulate a live request.
  - Kinds: Human browser · AI-app request (ShopBuddy) · Registered crawler (Web Bot Auth signed) · Buyer assistant (MCP) · Unidentified client · Suspicious headless.
  - Shows the generated headers, runs the router, stores the request and navigates to `/decisions/RQxxxx`.

## J4 · Decision Inspector (`05_Decision_Inspector.png`)
- **Request tabs at the top:** Human-facing RQ-1048 · Crawler RQ-1049 · Unknown RQ-1051, plus any simulated requests.
- **Request card:** Source, Page, Purpose, Confidence, Identity, Signal provider "Existing verification partner", Audience exposure.
- **Context profile card:** Topic, Purpose, Tone, Freshness, Candidate campaign, Evidence quote.
- **Final decision card:**
  - A timestamped checklist, e.g. ✓ Identity assessed 10:42:11.204 · ✓ Context matched · ✓ Publisher access policy checked · ✓ Advertising billing excluded
  - Ad displayed / Billable / Content access values
  - The note "Agent identity does not establish human exposure."
  - "Routed in X ms"
- **Routing rules** table with the applied row highlighted.
- **Buttons:**
  - View event log: a sheet with the raw JSON of the request + decision
  - Review routing policy: the policy table

## J5 · AI Channels (`06_AI_Channels.png`)
- **Tabs:** Sponsored answers · Licensed content access (**Planned** pill).
- **Placement rules card:** Application (ShopBuddy), Format, Context allowed (chips), Frequency, Approved assets only (switch), Sponsorship disclosure, "Sensitive or unsuitable request → No ad". **Save rules** persists them.
- **Answer preview card:**
  - Scenario select: Relevant shopping request ("Gift ideas under $50 for my sister who loves cooking") · Product recall question ("Is the holiday toy recall affecting my kid's gift?") · Job-loss budgeting ("I just lost my job, how do I budget for holidays?") · No consent.
  - **Run preview** calls the real ShopBuddy flow: the assistant answer, then (if a placement comes back) the sponsored card below it, with a "Sponsored · Kohl's" label, "Explore gifts" and a "Why this suggestion?" tooltip.
  - The card calls `/display` when visible (IntersectionObserver).
  - **Preview no-ad response** shows the reason chip (e.g. "No ad: sensitive request (recalls)").
- **Delivery funnel:** Requests › Offers › Displays confirmed › Clicks, starting from the seeded 12,400 / 8,480 / 8,060 / 242 and incrementing live. Note: "Returning an offer does not establish an impression."
- **Linked decision AI-2041:** checks (Consent ✓, Context allowed ✓, Not sensitive ✓, Frequency ✓, Display confirmed ✓, Billable ✓) + Inspect decision.
- **Licensed content access tab:** a static explainer.
  - Publisher-controlled terms for AI crawlers and agents (allow / deny / price per crawl).
  - A separate transaction from advertising; it uses the F2 crawler identification.
  - Status: Planned (Phase 3), with a disabled "Join pilot" button.
- **`/shopbuddy`:** a standalone chat page with neutral branding ("ShopBuddy", teal).
  - A consent toggle in the header ("Show sponsored suggestions").
  - It renders the same card flow. Use it for screen-sharing.

## J6 · Reports › Performance & experiments (`07_Reports_and_Experiments.png`)
- **Tabs:** Campaign performance · Context quality · **Experiment monitoring** (default) · Traffic quality. Give the other tabs simple real charts from the seed data.
- **Experiment "Purpose & tone pilot":**
  - status, dates
  - a control vs treatment table
  - a primary-outcome bar chart (conversions per 1k)
  - the result text from `twoProportionCI`: "+0.3 observed difference · 95% CI crosses zero · No conclusive uplift yet"
- **Guardrails table** with Passed / Watch pills.
- **Revenue reconciliation card.**
- **Rollout stepper:** Shadow ✓ › Pilot (current) › Ramp (pending).
  - **Approve ramp** is disabled, with a tooltip: "Needs conclusive uplift and all guardrails passing".
  - A **Pause pilot** button works and updates the status.

## J7 · Buying agent over MCP
See `phases/phase-09.md`. Drafts created over MCP show up in Campaigns with source **MCP** and in Settings › Agent runs with source "mcp". The Overview task "1 campaign draft from agent" links to them.

## Settings
- Model IDs (read-only display)
- Demo mode: shows live/cached; a toggle stored in a cookie overrides it per browser
- **Reset demo data** button
- Agent runs table (agent, model, source, latency, cached) with a JSON viewer
- MCP connection instructions (URL + config snippet)
- Disclaimer
