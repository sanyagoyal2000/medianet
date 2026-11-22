import type { Metadata } from "next";
export const metadata: Metadata = { title: "ShopBuddy · partner demo" };

export default function ShopBuddyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F3F7F7] text-[#0F2E2E]">{children}</div>;
}
