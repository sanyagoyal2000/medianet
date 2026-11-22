import { ROUTING_POLICIES } from "@/lib/traffic/policies";
import type { RequestPurpose } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { cn } from "@/lib/utils";

export function RoutingTable({ applied, detailed = false }: { applied?: RequestPurpose; detailed?: boolean }) {
  return (
    <table className="w-full text-[15px]">
      <thead>
        <tr className="bg-[#F2F4F7] text-left">
          <th className="px-3 py-2 font-semibold">Request type</th>
          <th className="px-3 py-2 font-semibold">Routing decision</th>
          {detailed && <th className="px-3 py-2 font-semibold">Billable</th>}
          {detailed && <th className="px-3 py-2 font-semibold">Content access</th>}
          <th className="px-3 py-2 font-semibold">Explanation (applied in this context)</th>
        </tr>
      </thead>
      <tbody>
        {ROUTING_POLICIES.map((p) => (
          <tr key={p.type} className={cn("border-b border-line", applied === p.type && "bg-[#E8F0FE] outline outline-2 -outline-offset-2 outline-link")} aria-current={applied === p.type ? "true" : undefined}>
            <td className="px-3 py-2">{p.label}{applied === p.type && <span className="ml-2 text-[12px] font-semibold text-link">Applied</span>}</td>
            <td className="px-3 py-2"><StatusPill variant={p.pill}>{p.decision}</StatusPill></td>
            {detailed && <td className="px-3 py-2">{p.billable}</td>}
            {detailed && <td className="px-3 py-2">{p.contentAccess}</td>}
            <td className="px-3 py-2">{p.explanation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
