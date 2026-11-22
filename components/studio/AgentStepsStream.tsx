import { CircleCheck, Loader2, Circle, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentStep = { label: string; state: "running" | "done" | "pending" | "error"; detail?: string };

export function AgentStepsStream({ steps, className }: { steps: AgentStep[]; className?: string }) {
  if (!steps.length) return null;
  return (
    <ol className={cn("space-y-2 rounded-md border border-line bg-[#F9FAFB] p-3", className)} aria-live="polite">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px]">
          {s.state === "done" && <CircleCheck className="mt-0.5 size-4 text-ok-solid" aria-label="done" />}
          {s.state === "running" && <Loader2 className="mt-0.5 size-4 animate-spin text-link" aria-label="running" />}
          {s.state === "pending" && <Circle className="mt-0.5 size-4 text-[#98A2B3]" aria-label="pending" />}
          {s.state === "error" && <CircleAlert className="mt-0.5 size-4 text-bad-solid" aria-label="error" />}
          <span>
            <span className={cn("text-ink", s.state === "pending" && "text-subtle")}>{s.label}</span>
            {s.detail && <span className="block text-[12px] text-subtle">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
