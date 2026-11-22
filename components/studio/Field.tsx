import { cn } from "@/lib/utils";
/** Label / value row used in the Request, Context profile and Page profile cards. */
export function Field({ label, children, className, labelWidth = "w-[150px]" }: { label: string; children: React.ReactNode; className?: string; labelWidth?: string }) {
  return (
    <div className={cn("flex items-start gap-3 border-b border-line py-2.5 last:border-b-0", className)}>
      <dt className={cn("shrink-0 text-[15px] text-ink", labelWidth)}>{label}:</dt>
      <dd className="min-w-0 flex-1 text-[15px] text-ink">{children}</dd>
    </div>
  );
}
