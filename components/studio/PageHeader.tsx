import Link from "next/link";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title, subtitle, crumbs, actions, titleExtra, className,
}: {
  title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode;
  titleExtra?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-[15px]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-subtle">/</span>}
              {c.href ? (
                <Link href={c.href} className="text-link underline-offset-2 hover:underline">{c.label}</Link>
              ) : (
                <span className="text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
            {titleExtra}
          </div>
          {subtitle && <p className="mt-1 text-[16px] text-[#475467]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
