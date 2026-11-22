# Phase 04 · F1 context engine + Context Library (J2)

**Read first:** spec/04 §1–3, spec/05 J2, `design/03_Context_Library.png`.

## Build
1. `lib/context/match.ts`: `evaluate()` exactly as in spec/04 §2, including the `today` mode, the fallback tiers and the TF-IDF relevance (`lib/context/tfidf.ts`). Wire it into `lib/planning/tools.ts`.
2. `lib/context/extract.ts`: fetch the URL (8 s timeout) → linkedom → Readability → `{title, text, site}`.
3. API routes: `POST /api/profile` (`{url}` | `{pageId}` | `{title, text}`), `GET /api/eligibility`, `POST /api/corrections`, `POST /api/corrections/[id]/resolve`.
4. **Context Library page**, matching the screenshot pixel-close:
   - KPIs computed from the data
   - filters and a sortable table
   - the Add content source dialog with live progress steps and a paste-text fallback
   - the Page profile side panel (review-gated selects, evidence, collapsible semantic representation, campaign eligibility with "Inspect decision", classification stepper)
   - the Request correction dialog
   - Reclassify selected
   - `CachedChip` when the profile came from cache
5. Sanity checks (manual): curl `/api/eligibility?campaignId=<kohls>&mode=context_studio` and confirm the toy recall is `excluded` with "Hard exclusion: Product recalls". With `mode=today`, confirm it's `eligible`.

## Done when
- Pasting a real public article URL (e.g. a news article) adds a profiled row with quotes from that page.
- Corrections update the status and KPIs.
- `npm run build` passes. Commit.

→ Tick Phase 04, continue to `phase-05.md`.
