"use client";
import { ChevronDown, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MultiSelect({
  value, onChange, options, ariaLabel, placeholder = "Choose…", summary, className,
}: {
  value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; ariaLabel: string;
  placeholder?: string; summary?: (labels: string[]) => string; className?: string;
}) {
  const labels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  const text = labels.length ? (summary ? summary(labels) : labels.join(" + ")) : placeholder;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[#D0D5DD] bg-white px-3 text-left text-[15px] text-ink hover:bg-[#F9FAFB]", !labels.length && "text-subtle", className)}
      >
        <span className="truncate">{text}</span>
        <ChevronDown className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value.includes(o.value)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(c) => onChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export { Check };
