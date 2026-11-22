# Phase 03 · Agent runtime, prompts and cached fallback

**Read first:** `spec/04-agents.md`.

## Build
1. `lib/ai/models.ts`: `MODELS = { planner: "claude-sonnet-5-5", fast: "claude-haiku-5-5" }`.
2. `lib/ai/prompts/*.md`: copy the system prompts from spec/04 word for word (contextProfiler, explainer, briefInterpreter, placementGuard, shopbuddy).
3. `lib/ai/run.ts`: a generic `runAgent({agent, model, system, input, schema, tools?, source})`. It handles the timeout, zod validation with one retry, logging to `agent_runs`, the cached fallback (exact hash → nearest example), and returns `{data, cached, latencyMs}`. Add a tool-use loop helper (max 6 turns) and a streaming variant that yields step events.
4. Implement the agent modules:
   - `lib/context/profiler.ts` (+ the evidence-substring post-check)
   - `lib/context/explainer.ts` (+ the person-reference check and template fallback)
   - `lib/aiChannels/placementGuard.ts` (hard rules first, then the LLM, then code checks)
   - `lib/planning/briefInterpreter.ts` (tools from `lib/planning/tools.ts`; stub `find_contexts`/`forecast_reach` against `lib/existing` now and wire match.ts in phase 04)
   - `lib/aiChannels/shopbuddy.ts`
5. `scripts/build-cache.ts`: runs every agent over every seeded page, the Holiday Gifting brief, 2 extra briefs, all 4 ShopBuddy scenarios, and the explainer for every seeded decision. It writes `data/cache/**`.
   - If `ANTHROPIC_API_KEY` is present in `.env.local`, run it.
   - If not, hand-write the cache files with realistic outputs so cached mode is complete. Note this in PROGRESS.md.
6. A demo-mode resolver: env, overridden by a `demo_mode` cookie.

## Done when
- Calling each agent through a temporary script returns valid data in cached mode (and in live mode if a key exists).
- `data/cache` is committed.
- `npm run build` passes. Commit.

→ Tick Phase 03, continue to `phase-04.md`.
