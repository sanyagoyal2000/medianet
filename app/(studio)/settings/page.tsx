import { headers, cookies } from "next/headers";
import { getRepo, dataAdapterLabel } from "@/lib/db/repo";
import { AGENT_MODELS } from "@/lib/ai/models";
import { envMode, hasKey } from "@/lib/ai/mode";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ agent?: string; source?: string }> }) {
  const sp = await searchParams;
  const repo = await getRepo();
  const runs = (await repo.agentRuns.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cookie = (await cookies()).get("demo_mode")?.value ?? null;
  return (
    <SettingsClient
      models={AGENT_MODELS}
      env={{ mode: envMode(), hasKey: hasKey(), cookie, adapter: dataAdapterLabel(), mcpToken: !!process.env.MCP_AUTH_TOKEN }}
      runs={runs}
      origin={origin}
      initialFilter={{ agent: sp.agent ?? "all", source: sp.source ?? "all" }}
    />
  );
}
