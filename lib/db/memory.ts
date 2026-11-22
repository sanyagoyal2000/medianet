// In-memory adapter: a globalThis store seeded from the bundled JSON. Survives hot reloads;
// resets on a serverless cold start (fine for a demo).
import type { Collection, Repo } from "./repo";
import { cloneSeed, type SeedData } from "./seed";

type Store = SeedData;
const g = globalThis as unknown as { __contextStudioStore?: Store };

function store(): Store {
  if (!g.__contextStudioStore) g.__contextStudioStore = cloneSeed();
  return g.__contextStudioStore;
}

function collection<K extends keyof Omit<Store, "meta">>(name: K, key: string): Collection<Store[K][number]> {
  type T = Store[K][number];
  const rows = () => store()[name] as unknown as T[];
  const k = (r: T) => (r as unknown as Record<string, unknown>)[key] as string;
  return {
    async list() { return structuredClone(rows()); },
    async get(id) { const r = rows().find((x) => k(x) === id); return r ? structuredClone(r) : null; },
    async insert(row) { rows().push(structuredClone(row)); return row; },
    async update(id, patch) {
      const r = rows().find((x) => k(x) === id);
      if (!r) return null;
      Object.assign(r as object, structuredClone(patch));
      return structuredClone(r);
    },
    async upsert(row) {
      const arr = rows();
      const i = arr.findIndex((x) => k(x) === k(row));
      if (i >= 0) arr[i] = structuredClone(row); else arr.push(structuredClone(row));
      return row;
    },
  };
}

export function createMemoryRepo(): Repo {
  return {
    kind: "memory",
    advertisers: collection("advertisers", "id"),
    campaigns: collection("campaigns", "id"),
    pages: collection("pages", "id"),
    profiles: collection("profiles", "pageId"),
    corrections: collection("corrections", "id"),
    requests: collection("requests", "id"),
    decisions: collection("decisions", "id"),
    aiOffers: collection("aiOffers", "id"),
    aiRules: collection("aiRules", "appId"),
    experiments: collection("experiments", "id"),
    agentRuns: collection("agentRuns", "id"),
    dailyTraffic: collection("dailyTraffic", "date"),
    automation: collection("automation", "type"),
    meta: {
      async get() { return structuredClone(store().meta); },
      async set(m) { store().meta = structuredClone(m); },
    },
    async reset() { g.__contextStudioStore = cloneSeed(); },
  };
}
