# Phase 00 · Scaffold and project setup

**Read first:** CLAUDE.md, all of `spec/`, all of `design/`.

## Build
1. Scaffold Next.js 15 (App Router, TypeScript, Tailwind, ESLint, `src/` not used, import alias `@/*`) **in the current folder**. Keep the existing `CLAUDE.md`, `PROGRESS.md`, `spec/`, `phases/`, `design/` and `.claude/`. If `create-next-app` refuses a non-empty folder, scaffold into a temp folder and move the files in.
2. Install:
   - `@anthropic-ai/sdk zod recharts lucide-react @mozilla/readability linkedom drizzle-orm @neondatabase/serverless mcp-handler @modelcontextprotocol/sdk nanoid clsx tailwind-merge`
   - dev: `drizzle-kit tsx`
3. Run `npx shadcn@latest init`, then add: button card table tabs select dialog sheet badge tooltip popover switch input textarea label checkbox dropdown-menu separator skeleton sonner progress scroll-area collapsible toggle.
4. Create the folders from the map below (empty `index.ts` where useful).
5. Create:
   - `.env.example` (see spec/06)
   - `.gitignore` including `.env*.local`
   - a `next.config.ts` that allows importing JSON
6. Add package scripts: `dev`, `build`, `start`, `lint`, `seed:generate` (`tsx scripts/generate-seed.ts`), `cache:build` (`tsx scripts/build-cache.ts`), `db:push`, `db:seed`.
7. Run `git init` and make the first commit.

```
app/(studio)/overview, campaigns, campaigns/[id], context-library, traffic,
  decisions/[requestId], ai-channels, reports, settings   ← share the studio layout
app/shopbuddy/                                             ← own layout
app/api/...                                                ← see spec/05
components/studio/   components/shopbuddy/
lib/existing/  lib/context/  lib/traffic/  lib/planning/  lib/aiChannels/
lib/ai/{models.ts,run.ts,prompts/}  lib/db/{repo.ts,memory.ts,postgres.ts,schema.ts}
data/seed/  data/cache/  scripts/
```

## Done when
- `npm run build` passes.
- `npm run dev` serves a placeholder page.
- The first commit is made.

→ Tick Phase 00 in PROGRESS.md and continue to `phase-01.md`.
