import { cn } from "@/lib/utils";

export function KpiCard({
  label, value, sub, pill, className, valueClassName, href,
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; pill?: React.ReactNode;
  className?: string; valueClassName?: string; href?: string;
}) {
  const inner = (
    <>
      <div className="text-[14px] text-[#475467]">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className={cn("text-[32px] font-semibold leading-none tracking-[-0.01em] text-ink tabular-nums", valueClassName)}>{value}</div>
        {pill}
      </div>
      {sub && <div className="mt-1 text-[13px] text-subtle">{sub}</div>}
    </>
  );
  return href ? (
    <a href={href} className={cn("studio-card block px-5 py-4 transition-colors hover:border-[#C9D2DE]", className)}>{inner}</a>
  ) : (
    <div className={cn("studio-card px-5 py-4", className)}>{inner}</div>
  );
}
