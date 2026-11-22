# Phase 08 · Overview, Reports & experiments, Settings (J8, J6)

**Read first:** spec/05 J8, J6, Settings; `design/01_Overview.png`, `design/07_Reports_and_Experiments.png`.

## Build
1. **Overview**, matching the screenshot, wired to live data:
   - KPIs (equal to the Traffic and Context Library numbers)
   - Contextual delivery table + line chart
   - Request purpose stacked bar
   - Recent delivery decisions with Inspect links
   - Tasks awaiting review (live counts, linking to J2 filtered, the agent draft in Campaigns, and J3 unknown review)
   - the AI channels card
   - header buttons: Inspect request (the dialog from phase 06) and Create campaign
2. `lib/existing/elevate.ts`: `twoProportionCI()`. Use the normal approximation, 95%.
3. **Reports page**, matching the screenshot:
   - **Experiment monitoring tab:** the pilot details, control vs treatment, the primary-outcome bar chart, the honest result text computed from the CI, the guardrails table with pills, revenue reconciliation, and the rollout stepper.
     - Approve ramp is disabled with a tooltip explaining why (computed: CI crosses zero, or any guardrail not passed).
     - Pause pilot works.
   - **Other tabs** (Campaign performance, Context quality, Traffic quality): one or two real charts each, from the seed data.
4. **Settings:** model IDs; the demo mode toggle (cookie); the data adapter in use; Reset demo data; the agent runs table with a JSON viewer and filters (agent, source); MCP connection instructions (filled in during phase 09); the disclaimer.

## Done when
- The Overview numbers equal the Traffic and Context Library numbers.
- The Reports result text is computed, not hard-coded.
- Approve ramp's gating works.
- `npm run build` passes. Commit.

→ Tick Phase 08, continue to `phase-09.md`.
