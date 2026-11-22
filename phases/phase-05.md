# Phase 05 · F3/F4 campaign brief, targeting and eligibility (J1)

**Read first:** spec/04 §3–4, spec/05 J1, `design/02_Campaign_Targeting.png`.

## Build
1. `POST /api/brief/interpret` (SSE), backed by `briefInterpreter`, using the real tools.
   - Stream the step events, then a `result` event with `{spec, summary, ambiguities}`.
   - Cached mode replays the steps with delays.
2. `GET /api/forecast`, `POST /api/explain`, `POST /api/campaigns`, `PATCH /api/campaigns/[id]`.
3. **Campaigns list page:** a table with status and source pills, and Create campaign (it creates a draft and opens the Brief tab).
4. **Campaign detail** with tabs.
   - **Brief:** textarea + Interpret brief + `AgentStepsStream` + summary and ambiguities.
   - **Targeting**, matching the screenshot: the rules form, the Placement eligibility table with expandable "Why this matches" + "Evidence from content", the forecast line, the **Compare: Today (topic only)** toggle with "changed" badges, the Context profile card, and the Ad preview with the **Why this ad?** popover (Explainer).
   - **Footer:** "Agent access: Connected · Read & draft only · View activity", Save draft, Review campaign (toast with the Deals Desk draft id).
   - Editing any rule re-queries eligibility (debounced).
   - **Placements tab:** the full ranked list with scores.
   - **Performance tab:** a simple chart from the seed data.
5. Build the Kohl's creative in code (no external images, no real Kohl's logo: use the text "Kohl's" in a simple wordmark style plus generic gift tiles).

## Done when
- J1 works end to end: brief → streamed steps → rules filled → gift guide Eligible / recall Excluded → toggle flips the recall → Why this ad? shows the reader reason → Review campaign sets `in_review`.
- It works in cached mode too.
- `npm run build` passes. Commit.

→ Tick Phase 05, continue to `phase-06.md`.
