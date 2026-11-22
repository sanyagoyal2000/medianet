import { getRepo } from "@/lib/db/repo";
import { aiFunnel } from "@/lib/queries";
import { AiChannelsClient } from "./AiChannelsClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const repo = await getRepo();
  const [rules, funnel, offers] = await Promise.all([repo.aiRules.get("shopbuddy"), aiFunnel(), repo.aiOffers.list()]);
  const latest = offers.filter((o) => o.returned).sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;
  return <AiChannelsClient rules={rules!} funnel={funnel} latest={latest} initialTab={tab === "licensed" ? "licensed" : "sponsored"} />;
}
