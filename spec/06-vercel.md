# 06 · Vercel deployment constraints

Design for Vercel from phase 00. Don't retrofit.

## Runtime
- Every route handler: `export const runtime = "nodejs"`.
- Agent routes (`/api/profile`, `/api/brief/interpret`, `/api/explain`, `/api/v1/ai-placements`, `/api/shopbuddy/chat`, `/api/mcp`): `export const maxDuration = 60`.
- No filesystem writes at runtime except `/tmp`. Seed and cache JSON are **imported** (bundled), not read with `fs` at runtime. Use `import seed from "@/data/seed/pages.json"`, or `fs` with `process.cwd()` plus `outputFileTracingIncludes` in `next.config.ts`. Prefer imports.
- No background workers or long-lived processes. Anything slow streams (SSE) or shows progress.
- Mark pages that read changing data `export const dynamic = "force-dynamic"`.
- Use `linkedom` (not jsdom) with `@mozilla/readability` to extract URLs. Use `fetch` with an 8 s `AbortController` timeout and a normal browser user agent.

## Data
- **No `DATABASE_URL`:** the in-memory adapter on `globalThis`. Data resets on cold start. Fine for a demo; Settings shows "Demo data: in-memory (resets on redeploy)".
- **`DATABASE_URL` set (Neon via the Vercel Marketplace):** the Postgres adapter, so data persists. Settings shows "Demo data: Postgres".

## Environment variables

| Name | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | no | n/a | Without it, everything runs cached |
| `DEMO_MODE` | no | `live` if key present, else `cached` | |
| `DATABASE_URL` | no | n/a | Neon Postgres |
| `MCP_TOKEN` | no | n/a | If set, `/api/mcp` requires `Authorization: Bearer <token>` |
| `NEXT_PUBLIC_APP_URL` | no | n/a | Used in MCP instructions and ShopBuddy → API calls (fall back to the request origin) |

Commit `.env.example` with all of these.

## MCP on Vercel
Use `mcp-handler` (Vercel's adapter) in `app/api/mcp/route.ts` (or `app/api/[transport]/route.ts` per its docs), with the Streamable HTTP transport, stateless. **Check the package's current README before writing the code** (`npm view mcp-handler` / its GitHub), because the API may have changed.

Connect from Claude Desktop either way:
- Settings › Connectors › Add custom connector › `https://<app>.vercel.app/api/mcp`
- or `claude_desktop_config.json`:
  ```json
  { "mcpServers": { "media-net-context-studio": {
      "command": "npx", "args": ["-y", "mcp-remote", "https://<app>.vercel.app/api/mcp"] } } }
  ```

## Deploy steps (phase 10)
1. `npm run build` passes locally.
2. Make sure the git repo is committed.
3. If `vercel whoami` fails, **stop and ask the user to run `vercel login`** (or to import the repo at vercel.com/new). This is one of the only allowed questions.
4. `vercel link --yes`, then `vercel env add` for whatever keys the user has provided, then `vercel --prod --yes`.
5. Smoke-check the production URL with curl: `/overview` returns 200, `POST /api/requests/simulate` works, and `/api/mcp` responds to an MCP `initialize`.
6. Write the URL into `PROGRESS.md` and the README.
