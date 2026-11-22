"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, RotateCcw } from "lucide-react";
import type { AgentRun } from "@/lib/types";
import { PageHeader } from "@/components/studio/PageHeader";
import { Btn } from "@/components/studio/Buttons";
import { StatusPill } from "@/components/studio/StatusPill";
import { SimpleSelect } from "@/components/studio/SimpleSelect";
import { Drawer } from "@/components/studio/Drawer";
import { JsonView } from "@/components/studio/JsonView";
import { relTime } from "@/lib/format";

export function SettingsClient({ models, env, runs, origin, initialFilter }: {
  models: Record<string, string>;
  env: { mode: "live" | "cached"; hasKey: boolean; cookie: string | null; adapter: string; mcpToken: boolean };
  runs: AgentRun[]; origin: string; initialFilter: { agent: string; source: string };
}) {
  const router = useRouter();
  const [agent, setAgent] = useState(initialFilter.agent);
  const [source, setSource] = useState(initialFilter.source);
  const [open, setOpen] = useState<AgentRun | null>(null);
  const [resetting, setResetting] = useState(false);
  const effective = env.cookie === "live" || env.cookie === "cached" ? (env.cookie === "live" && !env.hasKey ? "cached" : env.cookie) : env.mode;

  const agents = useMemo(() => [...new Set(runs.map((r) => r.agent))].sort(), [runs]);
  const visible = runs.filter((r) => (agent === "all" || r.agent === agent) && (source === "all" || r.source === source));

  function setMode(m: "live" | "cached" | "default") {
    document.cookie = m === "default" ? "demo_mode=; path=/; max-age=0" : `demo_mode=${m}; path=/; max-age=31536000; samesite=lax`;
    toast.success(m === "default" ? "Demo mode follows the server default" : `Demo mode set to ${m} for this browser`);
    router.refresh();
  }
  async function reset() {
    setResetting(true);
    const r = await fetch("/api/admin/reset", { method: "POST" });
    setResetting(false);
    if (r.ok) { toast.success("Demo data reset to the seed"); router.refresh(); } else toast.error("Reset failed");
  }
  const mcpUrl = `${origin}/api/mcp`;
  const config = JSON.stringify({ mcpServers: { "media-net-context-studio": { command: "npx", args: ["-y", "mcp-remote", mcpUrl, ...(env.mcpToken ? ["--header", "Authorization: Bearer ${MCP_AUTH_TOKEN}"] : [])] } } }, null, 2);
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  return (
    <>
      <PageHeader title="Settings" subtitle="Models, demo mode, data and agent access." />
      <div className="grid grid-cols-3 gap-4">
        <section className="studio-card p-5">
          <h2 className="mb-3 text-[19px] font-bold">Models</h2>
          <table className="w-full text-[14px]"><tbody>
            {Object.entries(models).map(([a, m]) => (
              <tr key={a} className="border-b border-line last:border-0"><td className="py-1.5">{a}</td><td className="py-1.5 text-right font-mono text-[13px]">{m}</td></tr>
            ))}
          </tbody></table>
          <p className="mt-2 text-[12px] text-subtle">Read-only. Set in <code>lib/ai/models.ts</code>.</p>
        </section>
        <section className="studio-card p-5">
          <h2 className="mb-3 text-[19px] font-bold">Demo mode</h2>
          <p className="text-[14px]">Effective: <StatusPill variant={effective === "live" ? "green" : "amber"}>{effective}</StatusPill></p>
          <p className="mt-1 text-[13px] text-subtle">Server default: {env.mode} · API key {env.hasKey ? "present" : "not set (agents use the committed cache)"}</p>
          <div className="mt-3 flex gap-2">
            {(["live", "cached", "default"] as const).map((m) => (
              <Btn key={m} kind={(env.cookie ?? "default") === m ? "blue" : "secondary"} className="h-9 text-[14px] capitalize" disabled={m === "live" && !env.hasKey} onClick={() => setMode(m)}>{m}</Btn>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-subtle">Stored in a cookie for this browser only. Every agent falls back to cache on errors or timeouts either way.</p>
        </section>
        <section className="studio-card p-5">
          <h2 className="mb-3 text-[19px] font-bold">Demo data</h2>
          <p className="text-[14px]">Demo data: <b>{env.adapter}</b></p>
          <p className="mt-1 text-[13px] text-subtle">Reset restores the seed (pages, campaigns, requests, offers, experiment) and clears live simulations.</p>
          <Btn kind="danger-outline" className="mt-3" onClick={reset} disabled={resetting}>{resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Reset demo data</Btn>
        </section>
      </div>

      <section className="studio-card mt-4 p-5" id="mcp">
        <div className="flex items-center gap-3">
          <h2 className="text-[19px] font-bold">Agent access over MCP</h2>
          <StatusPill variant="green">Connected · Read &amp; draft only</StatusPill>
          {env.mcpToken && <StatusPill variant="blue">Bearer token required</StatusPill>}
        </div>
        <p className="mt-1 text-[14px]">Buyers&apos; own AI agents can plan against Media.net inventory with 5 tools: <code>find_contexts</code>, <code>explain_match</code>, <code>forecast_reach</code>, <code>create_package</code> (drafts only) and <code>list_campaigns</code>. Nothing an agent does activates spend.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[14px]">
          <div>
            <p className="font-semibold">1 · Claude Desktop › Settings › Connectors › Add custom connector</p>
            <div className="mt-1 flex items-center gap-2"><code className="flex-1 rounded bg-[#F2F4F7] px-2 py-1.5">{mcpUrl}</code><Btn kind="secondary" className="h-8" onClick={() => copy(mcpUrl)} aria-label="Copy MCP URL"><Copy className="size-4" /></Btn></div>
            <p className="mt-3 font-semibold">Sample prompt</p>
            <p className="mt-1 rounded bg-[#F2F4F7] p-2 italic">Using Media.net Context Studio, find US gift guides and comparisons under $50 for Kohl&apos;s holiday campaign, exclude recalls and tragedy, forecast reach, and save a draft package.</p>
          </div>
          <div>
            <p className="font-semibold">2 · or <code>claude_desktop_config.json</code></p>
            <div className="relative mt-1"><JsonView value={JSON.parse(config)} /><Btn kind="secondary" className="absolute right-2 top-2 h-7 text-[12px]" onClick={() => copy(config)}>Copy</Btn></div>
          </div>
        </div>
      </section>

      <section className="studio-card mt-4 p-5" id="runs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-bold">Agent runs</h2>
          <div className="flex gap-3">
            <SimpleSelect ariaLabel="Agent filter" className="w-[220px]" prefix="Agent:" value={agent} onChange={setAgent} options={[{ value: "all", label: "All" }, ...agents.map((a) => ({ value: a, label: a }))]} />
            <SimpleSelect ariaLabel="Source filter" className="w-[160px]" prefix="Source:" value={source} onChange={setSource} options={["all", "ui", "mcp", "partner", "script"].map((s) => ({ value: s, label: s === "all" ? "All" : s }))} />
          </div>
        </div>
        <table className="w-full text-[14px]">
          <thead><tr className="bg-[#F2F4F7] text-left">{["When", "Agent", "Model", "Source", "Latency", "Cached", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-subtle">No runs match these filters.</td></tr>}
            {visible.slice(0, 100).map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="px-3 py-1.5 text-subtle">{relTime(r.createdAt)}</td>
                <td className="px-3 py-1.5 font-mono text-[13px]">{r.agent}</td>
                <td className="px-3 py-1.5 font-mono text-[13px]">{r.model}</td>
                <td className="px-3 py-1.5"><StatusPill variant={r.source === "mcp" ? "blue" : "grey"}>{r.source}</StatusPill></td>
                <td className="px-3 py-1.5 tabular-nums">{r.latencyMs} ms</td>
                <td className="px-3 py-1.5">{r.cached ? <StatusPill variant="amber">cached</StatusPill> : <StatusPill variant="green">live</StatusPill>}</td>
                <td className="px-3 py-1.5"><button type="button" className="text-link hover:underline" onClick={() => setOpen(r)}>View JSON</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-[13px] text-subtle">Existing Media.net systems (ContextGraph, SearchSignals, Deals Desk, verification partner, ELEVATE) are simulated.</p>

      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? `${open.agent} · ${open.id}` : ""} width="sm:max-w-2xl">
        {open && <JsonView value={open} />}
      </Drawer>
    </>
  );
}
