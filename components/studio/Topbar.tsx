"use client";
import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, CircleHelp, Tag } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Selector({ icon, label, items, width }: { icon?: React.ReactNode; label: string; items: { label: string; href?: string }[]; width: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex h-10 items-center gap-2.5 rounded-md border border-[#D0D5DD] bg-white px-3 text-[15px] text-ink hover:bg-[#F9FAFB] ${width}`}
      >
        {icon}
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-4 text-ink" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {items.map((i) =>
          i.href ? (
            <DropdownMenuItem key={i.label} asChild>
              <Link href={i.href}>{i.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={i.label}>{i.label}</DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ focusCampaignId, taskCount }: { focusCampaignId: string; taskCount: number }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b border-line bg-white pl-6 pr-5">
      <Selector label="Media.net Workspace" width="w-[230px]" items={[{ label: "Media.net Workspace" }]} />
      <Selector
        icon={<Tag className="size-[18px]" aria-hidden />}
        label="Holiday Gifting 2026"
        width="w-[245px]"
        items={[
          { label: "Holiday Gifting 2026", href: `/campaigns/${focusCampaignId}?tab=targeting` },
          { label: "All campaigns", href: "/campaigns" },
        ]}
      />
      <Selector
        icon={<CalendarDays className="size-[18px]" aria-hidden />}
        label="Last 7 days"
        width="w-[175px]"
        items={[{ label: "Last 7 days (16 – 22 Nov 2026)" }]}
      />
      <DropdownMenu>
        <DropdownMenuTrigger className="relative ml-2 rounded-full p-2 hover:bg-[#F2F4F7]" aria-label={`Notifications: ${taskCount} tasks`}>
          <Bell className="size-6 text-[#475467]" strokeWidth={1.6} />
          {taskCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {taskCount}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Tasks awaiting review</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/context-library?status=needs_review">Context profiles to review</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/campaigns?source=mcp">Targeting drafts</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/traffic?review=unknown">Unknown request cases</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link href="/settings" className="rounded-full p-2 hover:bg-[#F2F4F7]" aria-label="Help and settings">
        <CircleHelp className="size-6 text-[#475467]" strokeWidth={1.6} />
      </Link>
      <span className="flex size-10 items-center justify-center rounded-full bg-[#E4E7EC] text-[15px] font-semibold text-ink" aria-label="Signed in as SG">
        SG
      </span>
    </header>
  );
}
