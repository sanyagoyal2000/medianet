"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Opt = { value: string; label: string };

export function SimpleSelect({
  value, onChange, options, prefix, className, disabled, ariaLabel, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: Opt[]; prefix?: string; className?: string; disabled?: boolean; ariaLabel: string; placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("!h-10 w-full rounded-md border-[#D0D5DD] bg-white px-3 text-[15px] text-ink [&_svg]:!text-ink", className)}
      >
        {prefix && <span className="text-ink">{prefix}</span>}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
