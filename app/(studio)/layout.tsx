import { Sidebar } from "@/components/studio/Sidebar";
import { Topbar } from "@/components/studio/Topbar";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <Sidebar />
      <div className="pl-[240px]">
        <Topbar focusCampaignId="cmp-kohls-holiday-2026" taskCount={3} />
        <main className="mx-auto max-w-[1440px] px-6 pb-6 pt-5">{children}</main>
        <footer className="px-6 pb-6 text-center text-[12px] text-subtle">
          Concept prototype for a Media.net PM case study · not an official Media.net product.
        </footer>
      </div>
    </div>
  );
}
