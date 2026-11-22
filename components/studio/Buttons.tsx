import Link from "next/link";
import { cn } from "@/lib/utils";

type Kind = "primary" | "outline" | "blue" | "secondary" | "danger-outline";
const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";
const kinds: Record<Kind, string> = {
  primary: "bg-cta text-white hover:bg-cta-hover",
  outline: "border border-link bg-white text-link hover:bg-[#F0F6FF]",
  blue: "bg-blue text-white hover:bg-[#0157CC]",
  secondary: "border border-[#D0D5DD] bg-white text-ink hover:bg-[#F9FAFB]",
  "danger-outline": "border border-bad-solid bg-white text-bad hover:bg-bad-bg",
};

export function btn(kind: Kind = "primary", className?: string) {
  return cn(base, kinds[kind], className);
}

export function Btn({ kind = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind }) {
  return <button type="button" className={btn(kind, className)} {...rest} />;
}

export function LinkBtn({ kind = "primary", className, href, children }: { kind?: Kind; className?: string; href: string; children: React.ReactNode }) {
  return <Link href={href} className={btn(kind, className)}>{children}</Link>;
}

export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={cn("text-[15px] text-link hover:underline underline-offset-2", className)}>{children}</Link>;
}
