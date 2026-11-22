# 01 · Product

## One paragraph
**Context Studio** lives inside Media.net's workspace. Media.net already knows what a page is *about*: SearchSignals, ContextGraph (7M+ topics), and contextual analysis of ~150M URLs a day. It already sells curated deals (SELECT, Deals Desk), with measurement (ELEVATE) and verification partners. Context Studio adds four things:
- what a page is **for** (purpose) and its **tone**, each with quoted evidence
- **who is really requesting** the ad (human, AI app, crawler, buying agent, unknown, suspicious), so only displayed, human-facing impressions are billed
- **planning from a plain-English brief**, in the UI or by a buyer's own AI agent over MCP
- **sponsored answers inside partner AI apps** (Phase 2)

Every decision has a reason. That includes a reader-facing "Why this ad?" that never mentions the person.

## Running example
**Advertiser:** Kohl's. **Campaign:** "Holiday Gifting 2026".
**Brief:** *"Find US gift guides and product comparisons under $50. Prefer practical, upbeat content. Exclude product recalls and tragedy."*

**Key moment:** two pages with the same topic get opposite decisions.
- *"20 holiday gifts under $50"* → **Eligible**
- *"Holiday toy recall: 40k gifts pulled"* → **Excluded**: "Hard exclusion: Product recalls"

With the toggle set to **Today (topic only)**, the recall page would have been eligible.

## Feature map

| ID | Feature | Where it lives in the app |
|---|---|---|
| **F1** | Purpose and tone profile with evidence, confidence and freshness, on top of ContextGraph topics | Context Library; Campaign › Targeting › Placement eligibility; Decision Inspector |
| **F2** | Traffic-purpose routing (requester ≠ audience; unknown ≠ human; deterministic, under 5 ms) | Traffic Intelligence; Decision Inspector; Overview › Request purpose |
| **F3** | Plan from a brief ("Interpret brief") + an MCP endpoint for buying agents; output = a Deals Desk **draft** | Campaign › Brief/Targeting; `/api/mcp`; "Agent access: Connected · Read & draft only" |
| **F4** | "Why this ad?" (reader-facing, context only) | Ad preview on Targeting; AI Channels answer card |
| **Phase 2** | AI Channels › Sponsored answers (ShopBuddy pilot); returned ≠ displayed; billable only on display | AI Channels; `/shopbuddy` partner demo |
| **Phase 3** | Licensed content access (publisher-controlled) | AI Channels tab marked **Planned** (static explainer only) |
| Measurement | Experiments, guardrails, revenue reconciliation, rollout gates (Shadow › Pilot › Ramp) | Reports › Performance & experiments |

## Simulated "existing Media.net" (read-only inputs; never re-built for real)
- **ContextGraph:** topic paths
- **SearchSignals:** intent score
- **Deals Desk:** forecast + deal request queue
- **Verification partner:** IVT score + declared identity
- **ELEVATE:** conversions
- **History:** past delivery

New features read these and write **new fields**. They never replace existing behaviour.

## North Star and guardrails (shown in Reports)
- **North Star:** incremental qualified conversions per 1,000 eligible human-facing requests (via ELEVATE).
- **Guardrails:**
  - added lookup p99 < 5 ms
  - fill rate and timeouts flat
  - 0 severe unsuitable placements
  - false exclusions ≤ baseline
  - CPA ≤ control
  - legitimate traffic filtered < 1%
  - no agent spend without approval
  - no fabricated forecasts

## Agents

| Agent | Model / method |
|---|---|
| Context Profiler (F1) | Haiku |
| Brief Interpreter (F3) | Sonnet + tools |
| Explainer (F4) | Haiku, cached |
| Placement Guard (Phase 2) | Haiku + hard rules |
| Traffic Router (F2) | Rules only, no LLM |
| ShopBuddy assistant | Sonnet (partner-side) |
