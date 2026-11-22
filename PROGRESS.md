# Build progress

Claude Code: tick each phase when `npm run build` passes and its "Done when" list is satisfied. Add short notes, and resume from the first unticked phase.

- [x] Phase 00 · Scaffold and project setup
- [x] Phase 01 · Design system and app shell
- [x] Phase 02 · Data layer, simulated Media.net systems, seed
- [x] Phase 03 · Agent runtime, prompts and cached fallback
- [x] Phase 04 · F1 context engine + Context Library (J2)
- [x] Phase 05 · F3/F4 campaign brief, targeting and eligibility (J1)
- [ ] Phase 06 · F2 traffic router, Traffic Intelligence, Decision Inspector (J3, J4)
- [ ] Phase 07 · Phase 2 AI Channels + ShopBuddy, Phase 3 planned (J5)
- [ ] Phase 08 · Overview, Reports & experiments, Settings (J8, J6)
- [ ] Phase 09 · MCP endpoint for buying agents (J7)
- [ ] Phase 10 · Polish, README, deploy to Vercel

## Notes / decisions
(Claude Code appends here)

- **P00:** Next.js 15.5 + React 19, Tailwind v4, shadcn (radix/nova). Tailwind v4 has no `tailwind.config.ts`; the tokens live in `app/globals.css` under `@theme inline` instead (e.g. `bg-brand`, `text-link`, `bg-ok-bg`). Prompts (`*.md`) are bundled as strings with a webpack `asset/source` rule; tsx scripts use `scripts/register-md.mjs`.
- **P01:** Sidebar (240px, gradient + diagonal shading, active bar), top bar, and the components in `components/studio/*` (KpiCard, Card, StatusPill, DataTable, Stepper/PathStepper, EvidenceQuote, ChipInput, PageHeader, CachedChip, AgentStepsStream, Drawer, JsonView, Field). Every studio route is in place; `/` redirects to `/overview`. The ShopBuddy layout is separate.
- **Decision:** the daily traffic bars use the `04_Traffic_Intelligence.png` values (118,400 / 15,200 / 7,400 …), not the rounded spec/03 table, because they sum exactly to 840k / 110k / 50k.

- **P02:** `lib/db/repo.ts` defines one interface over generic collections. `memory.ts` keeps a `globalThis` store seeded from the imported JSON; `postgres.ts` uses Drizzle + Neon HTTP with the full schema in `schema.ts`. `scripts/generate-seed.ts` holds 29 pages (each 150–300 original words, evidence checked verbatim) and 24 live campaigns plus the Kohl's draft and one MCP agent draft. RQ1041–RQ1056 are built **through the real router**. `npm run check` prints traffic 1,000,000 / 840k / 110k / 50k, context 91.2% / 2 / 6.1% / 2.7%, a 2.4M forecast (3.1M in Today mode), the recall Excluded→Eligible flip, and the AI funnel 12,400 / 8,480 / 8,060 / 242.
- **Decision:** the context KPIs are percentages of a 1M-URL inventory baseline (`meta.coverageBaseline`) plus the live sample pages, so corrections move the counts without breaking 91.2%.
- **Decision:** purpose is a targeting requirement in Context Studio mode ("Purpose not targeted"), applied after the spec's hard rules. Tone only ranks. Today mode = topic, tier and country only.
- **Decision:** `04_Traffic_Intelligence.png` shows RQ1050 as a buyer assistant (Planning only), which differs from spec/03's table (AI app). I followed the screenshot. The AI-app requests are RQ1047/RQ1053 (Awaiting display). The Overview's four recent decisions are RQ1053–RQ1056.

- **P03:** `lib/ai/run.ts` handles structured calls (`messages.parse` + `zodOutputFormat`, 25 s timeout, zod re-validation with 1 retry), refusal and error fallback to cache, and `agent_runs` logging. It also has a manual tool loop (max 6 turns, `tool_choice` auto because Sonnet 5.5 rejects forced choice). The prompts are copied word for word into `lib/ai/prompts/*.md`. The demo mode comes from env, overridden by a `demo_mode` cookie.
- **No `ANTHROPIC_API_KEY` was available**, so `data/cache/**` (98 entries) is **hand-authored offline** by `npm run cache:build`: the profiler uses the seed profiles, the explainer covers every page × focus campaign, and there are 3 briefs and 4 ShopBuddy scenarios. Re-run with a key in `.env.local` to replace them with live outputs.
- **Decision:** on a cache miss, the profiler, explainer, brief interpreter and placement guard use **deterministic offline heuristics** (with quotes taken from real sentences of the page) instead of the "nearest example". A nearest example would quote a different page, and the evidence check would then reject it. The nearest-example lookup is still the last resort.

- **P04:** `match.ts`/`tfidf.ts` are wired into the planning tools. `extract.ts` uses fetch (8 s, browser UA) → linkedom → Readability; verified live on a Wikipedia article. `/api/profile` streams NDJSON steps (Fetching → Extracting → Profiling → Checking evidence). Eligibility and correction APIs are done. The Context Library screen has computed KPIs, filters (including `?status=needs_review`), a sortable table, the Add source dialog with a paste-text fallback, the review-gated profile panel, semantic terms with an illustrative vector, a correction dialog with approve/reject, and Reclassify selected with progress. Curl confirmed: recall Excluded "Hard exclusion: Product recalls" in Context Studio mode and Eligible in Today mode; a correction takes Needs review from 2 to 3.

- **P05:** `/api/brief/interpret` streams SSE (curl showed the 6 friendly steps, then the result with spec and 2.4M). Forecast, explain and campaign create/PATCH APIs are done. Review sets `in_review` and files a Deals Desk **draft** request (e.g. DR-4540). The Campaigns list shows status and source pills, with filters including `?source=mcp`. The campaign detail has Brief (live steps, summary, ambiguities), Targeting (matches the screenshot: rules form, debounced eligibility, the Compare Today toggle with "changed" badges, expandable why/evidence, context profile card, a Kohl's creative built in SVG, and a Why this ad? popover driven by the Explainer), Placements (ranked with scores) and Performance (opportunities chart).
- **Decision:** Save draft and Review campaign sit in the page header, as in `02_Campaign_Targeting.png`, rather than in a footer bar. The "Agent access" line closes the rules card. The eligibility table shows the top eligible pages plus the excluded or limited ones, with "Show all".

## Deployed URL
(Claude Code fills this in at the end)
