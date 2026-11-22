import { cn } from "@/lib/utils";

export type PillVariant = "green" | "amber" | "red" | "blue" | "grey";

const styles: Record<PillVariant, string> = {
  green: "bg-ok-bg text-ok",
  amber: "bg-warn-bg text-warn",
  red: "bg-bad-bg text-bad",
  blue: "bg-info-bg text-info",
  grey: "bg-grey-bg text-grey",
};

export function StatusPill({ variant = "grey", children, className }: { variant?: PillVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}

/** Map common domain labels to a pill colour. */
export function pillFor(label: string): PillVariant {
  const l = label.toLowerCase();
  if (/(excluded|stale|suspected|invalid|exclude|no ad impression|rejected)/.test(l)) return "red";
  if (/(needs review|review|awaiting|unknown|low|current|watch|draft|planned|medium|pending|in review|partner tier)/.test(l)) return "amber";
  if (/(eligible|fresh|displayed|high|passed|live|content|approved|within|no incident|advertising checks|planning only|complete|confirmed|billable)/.test(l)) return "green";
  if (/(human|info|mcp|ui)/.test(l)) return "blue";
  return "grey";
}
