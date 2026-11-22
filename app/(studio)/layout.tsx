import { Sidebar } from "@/components/studio/Sidebar";
import { Topbar } from "@/components/studio/Topbar";
import { taskCounts, FOCUS_CAMPAIGN_ID } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const t = await taskCounts();
  const tasks = (t.profilesToReview ? 1 : 0) + (t.agentDrafts ? 1 : 0) + (t.unknownOpen ? 1 : 0);
  return (
    <div className="min-h-screen bg-page">
      <Sidebar />
      <div className="pl-[240px]">
        <Topbar focusCampaignId={FOCUS_CAMPAIGN_ID} taskCount={tasks} />
        <main className="mx-auto max-w-[1440px] px-6 pb-6 pt-5">{children}</main>
        <footer className="px-6 pb-6 text-center text-[12px] text-subtle">
          Concept prototype for a Media.net PM case study · not an official Media.net product.
        </footer>
      </div>
    </div>
  );
}
