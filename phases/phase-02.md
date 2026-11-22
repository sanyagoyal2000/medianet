# Phase 02 · Data layer, simulated Media.net systems, seed

**Read first:** `spec/03-data-and-seed.md`, `spec/06-vercel.md`.

## Build
1. `lib/db/schema.ts`: the Drizzle Postgres schema for every entity.
2. `lib/db/repo.ts`: a typed interface. It picks `postgres.ts` when `DATABASE_URL` is set, otherwise `memory.ts`, a `globalThis` store initialised from the imported seed JSON with deep-cloning. Add `reset()`.
3. `lib/existing/*`: the five simulated systems, each with the SIMULATED header comment.
4. `scripts/generate-seed.ts` writes `data/seed/*.json`. Write all page texts as believable, original articles of 150–300 words. Include:
   - every number and row from spec/03 (exact totals)
   - `agent-registry.json` (registered crawlers, e.g. "NewsIndexBot", and buying agents, e.g. "Claude (buyer assistant)", with their keys)
   - context profiles for every page, with evidence quotes that really appear in the text
   - 24 campaigns
   - the experiment

   Run it and commit the JSON.
5. `scripts/db-seed.ts` pushes the JSON into Postgres (only used when the user sets up Neon).
6. `POST /api/admin/reset`.
7. Quick sanity check with a small script or route (not a test file): print the traffic totals and confirm 1,000,000 / 840,000 / 110,000 / 50,000, the context KPIs 91.2 / 2 / 6.1 / 2.7, and forecast ≈ 2.4M for Holiday Gifting.

## Done when
- Seed JSON exists and its numbers match the screenshots.
- `repo` works in memory mode.
- `npm run build` passes. Commit.

→ Tick Phase 02, continue to `phase-03.md`.
