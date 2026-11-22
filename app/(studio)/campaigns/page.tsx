import Link from "next/link";
import { getRepo } from "@/lib/db/repo";
import { PageHeader } from "@/components/studio/PageHeader";
import { StatusPill } from "@/components/studio/StatusPill";
import { CreateCampaignButton } from "@/components/studio/CreateCampaignButton";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusPill = { draft: ["amber", "Draft"], in_review: ["blue", "In review"], live: ["green", "Live"] } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ source?: string; status?: string }> }) {
  const sp = await searchParams;
  const repo = await getRepo();
  const [campaigns, advertisers] = await Promise.all([repo.campaigns.list(), repo.advertisers.list()]);
  const adv = new Map(advertisers.map((a) => [a.id, a.name]));
  const order = { draft: 0, in_review: 1, live: 2 } as const;
  const rows = campaigns
    .filter((c) => (!sp.source || c.source === sp.source) && (!sp.status || c.status === sp.status))
    .sort((a, b) => order[a.status] - order[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const tabs = [
    { label: `All (${campaigns.length})`, href: "/campaigns", active: !sp.source && !sp.status },
    { label: `Drafts (${campaigns.filter((c) => c.status !== "live").length})`, href: "/campaigns?status=draft", active: sp.status === "draft" },
    { label: `From agents · MCP (${campaigns.filter((c) => c.source === "mcp").length})`, href: "/campaigns?source=mcp", active: sp.source === "mcp" },
    { label: `Live (${campaigns.filter((c) => c.status === "live").length})`, href: "/campaigns?status=live", active: sp.status === "live" },
  ];
  return (
    <>
      <PageHeader title="Campaigns" subtitle="Plans, drafts from people and buying agents, and live campaigns." actions={<CreateCampaignButton />} />
      <nav className="mb-3 flex gap-2" aria-label="Campaign filters">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-[14px]", t.active ? "border-link bg-[#E8F0FE] text-link" : "border-line bg-white text-ink hover:bg-[#F9FAFB]")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="studio-card overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="bg-[#F2F4F7] text-left">
              {["Campaign", "Advertiser", "Status", "Source", "Deal request", "Updated"].map((h) => (
                <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-subtle">No campaigns match this filter.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line hover:bg-[#F5F8FF]">
                <td className="px-4 py-2.5">
                  <Link href={`/campaigns/${c.id}?tab=${c.status === "live" ? "placements" : c.brief ? "targeting" : "brief"}`} className="font-medium text-link hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-2.5">{adv.get(c.advertiserId)}</td>
                <td className="px-4 py-2.5"><StatusPill variant={statusPill[c.status][0]}>{statusPill[c.status][1]}</StatusPill></td>
                <td className="px-4 py-2.5"><StatusPill variant={c.source === "mcp" ? "blue" : "grey"}>{c.source === "mcp" ? "MCP" : "UI"}</StatusPill></td>
                <td className="px-4 py-2.5 tabular-nums text-subtle">{c.dealRequestId ?? "—"}</td>
                <td className="px-4 py-2.5 text-subtle">{relTime(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
