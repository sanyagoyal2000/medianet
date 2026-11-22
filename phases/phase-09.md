# Phase 09 · MCP endpoint for buying agents (J7)

**Read first:** spec/04 §4 tools, spec/06 "MCP on Vercel".

## Build
1. Check the current `mcp-handler` README (`npm view mcp-handler readme` or its GitHub) and follow its App Router pattern for a stateless Streamable HTTP endpoint at `/api/mcp`. Set `runtime = "nodejs"` and `maxDuration = 60`.
2. Register these tools, reusing `lib/planning/tools.ts` with zod input schemas and clear descriptions written for an AI buyer:

   | Tool | Description |
   |---|---|
   | `find_contexts` | Find Media.net pages that fit a campaign spec; returns eligible and excluded pages with reasons |
   | `explain_match` | Why a page is eligible or excluded for a campaign |
   | `forecast_reach` | Historical 7-day opportunity estimate; not guaranteed delivery |
   | `create_package` | Save a DRAFT targeting package for human approval; never activates spend |
   | `list_campaigns` | List campaigns, read-only |

3. Every tool call is logged to `agent_runs` with `source: "mcp"`. Packages created this way appear in Campaigns with source **MCP**, status **draft**, and they feed the Overview task "1 campaign draft from agent".
4. If `MCP_AUTH_TOKEN` is set, require `Authorization: Bearer`.
5. Settings › MCP shows the endpoint URL (from `NEXT_PUBLIC_APP_URL` or the request origin), both connection methods from spec/06, and a sample prompt: *"Using Media.net Context Studio, find US gift guides and comparisons under $50 for Kohl's holiday campaign, exclude recalls and tragedy, forecast reach, and save a draft package."*
6. **Manual check:** with `npm run dev`, use `npx @modelcontextprotocol/inspector` (or curl JSON-RPC `initialize` → `tools/list` → `tools/call find_contexts`) against `http://localhost:3000/api/mcp`. Confirm `create_package` creates a draft that's visible in the UI.

## Done when
- `tools/list` returns 5 tools.
- `create_package` over MCP creates a draft visible in Campaigns and in Settings › Agent runs.
- `npm run build` passes. Commit.

→ Tick Phase 09, continue to `phase-10.md`.
