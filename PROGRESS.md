# Build progress

Claude Code: tick each phase when `npm run build` passes and its "Done when" list is satisfied. Add short notes, and resume from the first unticked phase.

- [x] Phase 00 · Scaffold and project setup
- [x] Phase 01 · Design system and app shell
- [ ] Phase 02 · Data layer, simulated Media.net systems, seed
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

## Deployed URL
(Claude Code fills this in at the end)
