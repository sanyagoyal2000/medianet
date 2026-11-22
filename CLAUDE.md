# Media.net Context Studio: master instructions for Claude Code

You are building a **working prototype, deployed on Vercel**, for a Media.net product-management case study (*integrate contextual targeting into the existing ad server*). Everything you need is in this folder. **Build the whole thing on your own, phase by phase, without asking the user to paste anything.**

## How to work (read this first)

1. Read these in order before writing any code:
   - this file
   - `spec/01-product.md`
   - `spec/02-design-system.md`
   - `spec/03-data-and-seed.md`
   - `spec/04-agents.md`
   - `spec/05-screens-and-journeys.md`
   - `spec/06-vercel.md`

   Open every image in `design/`. They are the visual source of truth.
2. Execute `phases/phase-00.md` through `phases/phase-10.md` **in order**. Each phase file says what to build and when it is done.
3. After each phase:
   - run `npm run build` and fix every error
   - tick the phase in `PROGRESS.md` and add a 1–3 line note on what was built and anything deferred
   - continue straight to the next phase without stopping to ask
4. If you lose context or restart, read `PROGRESS.md` and resume at the first unticked phase.
5. Stop and ask the user **only** for:
   - a missing secret that blocks you (`ANTHROPIC_API_KEY`, Vercel login)
   - an irreversible action not described here

   Otherwise make the most reasonable choice, note it in `PROGRESS.md`, and keep going.
6. **Do not write automated tests** (no vitest, Jest, Playwright or test files). Verify by running `npm run build`, starting `npm run dev`, and clicking through each journey yourself (curl the API routes, check the pages render).
7. Commit to git at the end of each phase with a message like `phase-04: context library + profiler`.

## Hard rules (never break these)

- **Deploy target is Vercel.**
  - No local SQLite, no long-running processes, no stdio-only servers, no writes to the filesystem at runtime (except `/tmp`).
  - Every API route uses `export const runtime = "nodejs"`; agent routes also set `export const maxDuration = 60`.
- **Never claim Media.net lacks something it already has.** Media.net already has SearchSignals, ContextGraph topics, contextual analysis at scale, SELECT curation, Deals Desk, ELEVATE measurement and verification partners. Our features *extend* them. UI copy uses "With Context Studio", "Today (topic only)" and "Existing verification partner".
- Existing Media.net systems are **simulated** in `lib/existing/*`. Every file there starts with `// SIMULATED: stands in for Media.net's existing system`.
- **Traffic Router uses no LLM.** "Unknown" is never billed as human.
- **Agents only create drafts.** Nothing activates spend. A human approves.
- **Reader-facing explanations never reference the person** (history, location, device). They describe only the page or chat context.
- **The demo must never break.** Every agent call falls back to cached output when there is no key, a timeout or an error, and the UI shows a small "cached" chip when that happens.
- **Numbers are consistent across screens.** Overview totals equal Traffic totals, and the seed reproduces the numbers in `design/*.png`.

- No secrets in code. Use `.env.local` locally and Vercel env vars in production.

## Stack (fixed)

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, lucide-react, Recharts
- `@anthropic-ai/sdk`. Models are set in `lib/ai/models.ts`:
  - `claude-sonnet-5-5` for the Brief Interpreter and the ShopBuddy assistant
  - `claude-haiku-5-5` for the Context Profiler, Explainer and Placement Guard
- zod for every agent output
- Data:
  - repository layer `lib/db/repo.ts` with two adapters
  - **Neon Postgres** via Drizzle (`drizzle-orm/neon-http`) when `DATABASE_URL` is set
  - otherwise an **in-memory store** seeded from `data/seed/*.json` (works on Vercel with zero setup; resets on cold start)
- URL extraction: `@mozilla/readability` + `linkedom` (lighter than jsdom on serverless)
- MCP: Streamable HTTP endpoint at `/api/mcp` using `mcp-handler` (Vercel's MCP adapter) + `@modelcontextprotocol/sdk`

## Folder map

```
CLAUDE.md            ← you are here
PROGRESS.md          ← tick phases here
spec/                ← what to build (product, design, data, agents, screens, Vercel)
phases/              ← how to build it, in order (00 → 10)
design/              ← 7 reference screens (match them)
.claude/settings.json← permissions so you can run npm/git without prompts
```
