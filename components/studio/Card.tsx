import { cn } from "@/lib/utils";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={cn("studio-card p-5", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[19px] font-bold leading-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}
