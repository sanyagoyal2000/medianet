"use client";
import { useMemo, useState } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
};

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, selectedKey, loading, empty = "Nothing to show yet.", className, dense, initialSort,
}: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; selectedKey?: string | null;
  loading?: boolean; empty?: React.ReactNode; className?: string; dense?: boolean; initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = sv(a), y = sv(b);
      const r = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, sort, columns]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="bg-[#F2F4F7] text-left">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" aria-sort={c.sortValue ? (active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none") : undefined} className={cn("px-3 py-2 font-semibold text-ink", c.headerClassName)}>
                  {c.sortValue ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded hover:text-link"
                      onClick={() => setSort({ key: c.key, dir: active && sort?.dir === "asc" ? "desc" : "asc" })}
                    >
                      {c.header}
                      {active ? (sort?.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ChevronsUpDown className="size-3.5 text-subtle" />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-line">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3"><Skeleton className="h-4 w-full max-w-32" /></td>
                ))}
              </tr>
            ))}
          {!loading && sorted.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-subtle">{empty}</td></tr>
          )}
          {!loading &&
            sorted.map((r) => {
              const k = rowKey(r);
              return (
                <tr
                  key={k}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn(
                    "border-b border-line",
                    onRowClick && "cursor-pointer hover:bg-[#F5F8FF]",
                    selectedKey === k && "bg-[#E8F0FE] hover:bg-[#E8F0FE]",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-3 text-ink", dense ? "py-1.5" : "py-2.5", c.className)}>{c.cell(r)}</td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
