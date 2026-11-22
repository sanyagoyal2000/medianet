# Build progress

Claude Code: tick each phase when `npm run build` passes and its "Done when" list is satisfied. Add short notes, and resume from the first unticked phase.

- [x] Phase 00 · Scaffold and project setup
- [x] Phase 01 · Design system and app shell
- [x] Phase 02 · Data layer, simulated Media.net systems, seed
- [ ] Phase 03 · Agent runtime, prompts and cached fallback
- [ ] Phase 04 · F1 context engine + Context Library (J2)
- [ ] Phase 05 · F3/F4 campaign brief, targeting and eligibility (J1)
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

## Deployed URL
(Claude Code fills this in at the end)
