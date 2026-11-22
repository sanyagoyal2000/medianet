// Cached agent outputs (data/cache/<agent>/<hash>.json), bundled via data/cache/index.ts.
import { createHash } from "node:crypto";
import { CACHE } from "@/data/cache/index";

export interface CacheEntry {
  agent: string;
  hash: string;
  input: unknown;
  output: unknown;
  steps?: { label: string; detail?: string }[];
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim().toLowerCase();
  return v;
}

export const hashInput = (input: unknown) => createHash("sha256").update(JSON.stringify(canonical(input))).digest("hex").slice(0, 16);

const words = (v: unknown) => new Set(JSON.stringify(canonical(v)).match(/[a-z0-9$]{3,}/g) ?? []);

/** Exact hit by input hash, else the nearest seeded example for that agent (word overlap). */
export function lookupCache(agent: string, input: unknown, { exactOnly = false } = {}): (CacheEntry & { exact: boolean }) | null {
  const entries = CACHE[agent];
  if (!entries) return null;
  const hit = entries[hashInput(input)];
  if (hit) return { ...hit, exact: true };
  if (exactOnly) return null;
  const w = words(input);
  let best: CacheEntry | null = null;
  let bestScore = -1;
  for (const e of Object.values(entries)) {
    const ew = words(e.input);
    let inter = 0;
    for (const x of w) if (ew.has(x)) inter++;
    const score = inter / (w.size + ew.size - inter || 1);
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best ? { ...best, exact: false } : null;
}
