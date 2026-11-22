import { notFound } from "next/navigation";
import { getRepo } from "@/lib/db/repo";
import { ALL_TOPICS } from "@/lib/existing/contextGraph";
import { CampaignClient } from "./CampaignClient";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const repo = await getRepo();
  const campaign = await repo.campaigns.get(id);
  if (!campaign) notFound();
  const [advertiser, days] = await Promise.all([repo.advertisers.get(campaign.advertiserId), repo.dailyTraffic.list()]);
  return (
    <CampaignClient
      key={campaign.id}
      campaign={campaign}
      advertiser={advertiser?.name ?? ""}
      topics={ALL_TOPICS}
      days={days.sort((a, b) => a.date.localeCompare(b.date))}
      initialTab={(["brief", "targeting", "placements", "performance"].includes(tab ?? "") ? tab : campaign.brief ? "targeting" : "brief") as Tab}
    />
  );
}
type Tab = "brief" | "targeting" | "placements" | "performance";
