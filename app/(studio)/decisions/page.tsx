import { redirect } from "next/navigation";
import { getRepo } from "@/lib/db/repo";

export const dynamic = "force-dynamic";

/** /decisions -> the latest simulated request, else the crawler example from the screenshot. */
export default async function Page() {
  const repo = await getRepo();
  const latest = (await repo.requests.list()).filter((r) => r.simulated).sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2)))[0];
  redirect(`/decisions/${latest?.id ?? "RQ1049"}`);
}
