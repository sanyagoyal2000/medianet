// MCP endpoint for buyers' AI agents (Streamable HTTP, stateless) via mcp-handler 2.x.
// Read & draft only: create_package saves a DRAFT; nothing activates spend.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { SpecSchema } from "@/lib/planning/spec";
import { createPackage, explainMatch, findContexts, forecastReach, listCampaigns } from "@/lib/planning/tools";
import { logRun } from "@/lib/ai/run";

export const runtime = "nodejs";
export const maxDuration = 60;

async function logged<T>(name: string, input: unknown, fn: () => Promise<T>) {
  const t0 = Date.now();
  try {
    const out = await fn();
    await logRun({ agent: `mcp:${name}`, model: "deterministic", source: "mcp", input, output: out, latencyMs: Date.now() - t0, cached: false });
    return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRun({ agent: `mcp:${name}`, model: "deterministic", source: "mcp", input, output: { error: msg }, latencyMs: Date.now() - t0, cached: false });
    return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
  }
}

const SPEC_HELP =
  "Targeting spec. topics: ContextGraph paths such as 'Shopping > Gifts', 'Shopping > Home & Office', 'Shopping > Electronics', 'Travel > Winter Trips', 'Finance > Personal Budgeting'. " +
  "purposes: buying_guide | product_comparison | how_to | news | opinion | entertainment. tonePreference ranks only (never excludes). " +
  "excludeSensitive is a HARD exclusion list: recalls | tragedy | layoffs | health | financial_distress | violence | politics. country: ISO code (US). partnerTierMax: 1-3.";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "find_contexts",
      {
        title: "Find contexts",
        description: "Find Media.net pages that fit a campaign spec; returns eligible and excluded pages with reasons. " + SPEC_HELP,
        inputSchema: z.object({ spec: SpecSchema, limit: z.number().int().min(1).max(30).optional(), brief: z.string().optional().describe("The buyer's brief, used for relevance ranking") }),
      },
      async (args) => logged("find_contexts", args, () => findContexts(args)),
    );
    server.registerTool(
      "explain_match",
      {
        title: "Explain match",
        description: "Why a page is eligible or excluded for a campaign. Returns a buyer-facing reason and a reader-facing 'Why this ad?' that never references the person.",
        inputSchema: z.object({ pageId: z.string(), campaignId: z.string().describe("e.g. cmp-kohls-holiday-2026, or an id from list_campaigns") }),
      },
      async (args) => logged("explain_match", args, () => explainMatch(args, "mcp")),
    );
    server.registerTool(
      "forecast_reach",
      {
        title: "Forecast reach",
        description: "Historical 7-day opportunity estimate for a spec, from Deals Desk; not guaranteed delivery. Always use this instead of estimating numbers yourself. " + SPEC_HELP,
        inputSchema: z.object({ spec: SpecSchema }),
      },
      async (args) => logged("forecast_reach", args, () => forecastReach(args)),
    );
    server.registerTool(
      "create_package",
      {
        title: "Create draft package",
        description: "Save a DRAFT targeting package for human approval; never activates spend. Creates a new draft campaign (or updates a draft you pass by campaignId) and files a Deals Desk draft request. A person approves activation.",
        inputSchema: z.object({
          name: z.string().describe("Package / campaign name"),
          spec: SpecSchema,
          campaignId: z.string().optional().describe("Existing DRAFT campaign to update; live campaigns cannot be changed"),
          advertiser: z.string().optional().describe("Advertiser name, e.g. Kohl's, Wanderly, Northbank, VoltMart"),
          brief: z.string().optional(),
        }),
      },
      async (args) => logged("create_package", args, () => createPackage({ ...args, advertiserId: args.advertiser }, "mcp")),
    );
    server.registerTool(
      "list_campaigns",
      { title: "List campaigns", description: "List campaigns with advertiser, status (draft / in_review / live) and source (ui / mcp). Read-only.", inputSchema: z.object({}) },
      async (args) => logged("list_campaigns", args, () => listCampaigns()),
    );
  },
  { serverInfo: { name: "media-net-context-studio", version: "0.1.0" } },
);

async function guarded(req: Request) {
  const token = process.env.MCP_TOKEN;
  if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json", "www-authenticate": "Bearer" } });
  }
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
