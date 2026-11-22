"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House, Megaphone, Layers, TrendingUp, ShieldCheck, Sparkles, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/overview", label: "Overview", icon: House },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/context-library", label: "Context Library", icon: Layers },
  { href: "/traffic", label: "Traffic Intelligence", icon: TrendingUp },
  { href: "/decisions", label: "Decision Inspector", icon: ShieldCheck },
  { href: "/ai-app-placements", label: "AI App Placements", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="studio-sidebar fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col text-white">
      <Link
        href="/overview"
        className="flex h-16 flex-col justify-center bg-brand px-6 leading-none focus-visible:outline-white"
        aria-label="media.net Context Studio home"
      >
        <span className="text-[22px] font-bold tracking-tight">media.net</span>
        <span className="mt-0.5 text-[17px] font-normal">Context Studio</span>
      </Link>
      <nav className="mt-3 flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative mx-0 flex h-11 items-center gap-3 px-7 text-[16px] text-white/95 transition-colors hover:bg-white/10 focus-visible:outline-white focus-visible:-outline-offset-2",
                active && "bg-side-active font-medium hover:bg-side-active",
              )}
            >
              {active && <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />}
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
