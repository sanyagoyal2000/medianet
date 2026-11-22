// One repository interface, two adapters: Neon Postgres (DATABASE_URL set) or an in-memory store.
import type {
  Advertiser, AgentRun, AiOffer, AiRules, AutomationRow, Campaign, ContextProfile, Correction, DailyTraffic, Decision,
  Experiment, Meta, Page, TrafficRequest,
} from "../types";

export interface Collection<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  upsert(row: T): Promise<T>;
}

export interface Repo {
  kind: "memory" | "postgres";
  advertisers: Collection<Advertiser>;
  campaigns: Collection<Campaign>;
  pages: Collection<Page>;
  profiles: Collection<ContextProfile>;
  corrections: Collection<Correction>;
  requests: Collection<TrafficRequest>;
  decisions: Collection<Decision>;
  aiOffers: Collection<AiOffer>;
  aiRules: Collection<AiRules>;
  experiments: Collection<Experiment>;
  agentRuns: Collection<AgentRun>;
  dailyTraffic: Collection<DailyTraffic>;
  automation: Collection<AutomationRow>;
  meta: { get(): Promise<Meta>; set(m: Meta): Promise<void> };
  reset(): Promise<void>;
}

let instance: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (instance) return instance;
  if (process.env.DATABASE_URL) {
    const { createPostgresRepo } = await import("./postgres");
    instance = createPostgresRepo(process.env.DATABASE_URL);
  } else {
    const { createMemoryRepo } = await import("./memory");
    instance = createMemoryRepo();
  }
  return instance;
}

export const dataAdapterLabel = () =>
  process.env.DATABASE_URL ? "Postgres (Neon)" : "In-memory (resets on redeploy)";
