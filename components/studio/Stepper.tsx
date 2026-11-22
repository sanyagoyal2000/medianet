import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "pending";

/** Horizontal rollout-style stepper with circles and connecting lines. */
export function Stepper({ steps }: { steps: { label: string; sub?: string; state: StepState }[] }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-3">
          {i > 0 && (
            <span aria-hidden className={cn("h-0.5 w-20", steps[i - 1].state === "done" ? "bg-ok-solid" : "bg-[#D0D5DD]")} />
          )}
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border-2",
              s.state === "done" && "border-ok-solid bg-ok-solid text-white",
              s.state === "current" && "border-blue bg-white",
              s.state === "pending" && "border-[#D0D5DD] bg-white",
            )}
          >
            {s.state === "done" && <Check className="size-4" strokeWidth={3} />}
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold text-ink">{s.label}</span>
            {s.sub && <span className="block text-[13px] text-subtle">{s.sub}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Chevron "path" stepper (List › Evidence › Correction › Decision). */
export function PathStepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="size-4 text-ink" aria-hidden />}
          <span
            aria-current={i === active ? "step" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-md border px-3 text-[14px]",
              i === active ? "border-[#A6DDB0] bg-ok-bg text-ink" : "border-line bg-[#F9FAFB] text-ink",
            )}
          >
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}
