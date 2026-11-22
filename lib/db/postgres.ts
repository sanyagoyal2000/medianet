// Postgres adapter: Drizzle over Neon's HTTP driver. Used when DATABASE_URL is set.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, type InferSelectModel } from "drizzle-orm";
import type { PgTableWithColumns, PgColumn } from "drizzle-orm/pg-core";
import * as s from "./schema";
import type { Collection, Repo } from "./repo";
import { cloneSeed } from "./seed";
import type { Meta } from "../types";

type AnyTable = PgTableWithColumns<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type DB = ReturnType<typeof drizzle>;

const strip = <T extends object>(row: T) =>
  Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== undefined)) as T;

function collection<T>(db: DB, table: AnyTable, keyCol: PgColumn): Collection<T> {
  return {
    async list() { return (await db.select().from(table)).map((r) => strip(r) as T); },
    async get(id) { const r = await db.select().from(table).where(eq(keyCol, id)).limit(1); return r[0] ? (strip(r[0]) as T) : null; },
    async insert(row) { await db.insert(table).values(row as InferSelectModel<AnyTable>); return row; },
    async update(id, patch) {
      const r = await db.update(table).set(patch as Partial<InferSelectModel<AnyTable>>).where(eq(keyCol, id)).returning();
      return r[0] ? (strip(r[0]) as T) : null;
    },
    async upsert(row) {
      await db.insert(table).values(row as InferSelectModel<AnyTable>)
        .onConflictDoUpdate({ target: keyCol, set: row as Partial<InferSelectModel<AnyTable>> });
      return row;
    },
  };
}

const TABLES = [
  ["advertisers", s.advertisers], ["campaigns", s.campaigns], ["pages", s.pages], ["profiles", s.contextProfiles],
  ["corrections", s.corrections], ["requests", s.requests], ["decisions", s.decisions], ["aiOffers", s.aiOffers],
  ["aiRules", s.aiRules], ["experiments", s.experiments], ["agentRuns", s.agentRuns], ["dailyTraffic", s.dailyTraffic],
  ["automation", s.automationBreakdown],
] as const;

/** Wipes every table and loads data/seed/*.json. Used by reset() and scripts/db-seed.ts. */
export async function seedPostgres(db: DB) {
  const data = cloneSeed();
  for (const [name, table] of TABLES) {
    await db.delete(table);
    const rows = (data as unknown as Record<string, object[]>)[name];
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      if (chunk.length) await db.insert(table as AnyTable).values(chunk as InferSelectModel<AnyTable>[]);
    }
  }
  await db.delete(s.meta);
  await db.insert(s.meta).values({ key: "meta", value: data.meta });
}

export function createPostgresRepo(url: string): Repo {
  const db = drizzle(neon(url));
  return {
    kind: "postgres",
    advertisers: collection(db, s.advertisers, s.advertisers.id),
    campaigns: collection(db, s.campaigns, s.campaigns.id),
    pages: collection(db, s.pages, s.pages.id),
    profiles: collection(db, s.contextProfiles, s.contextProfiles.pageId),
    corrections: collection(db, s.corrections, s.corrections.id),
    requests: collection(db, s.requests, s.requests.id),
    decisions: collection(db, s.decisions, s.decisions.id),
    aiOffers: collection(db, s.aiOffers, s.aiOffers.id),
    aiRules: collection(db, s.aiRules, s.aiRules.appId),
    experiments: collection(db, s.experiments, s.experiments.id),
    agentRuns: collection(db, s.agentRuns, s.agentRuns.id),
    dailyTraffic: collection(db, s.dailyTraffic, s.dailyTraffic.date),
    automation: collection(db, s.automationBreakdown, s.automationBreakdown.type),
    meta: {
      async get() {
        const r = await db.select().from(s.meta).where(eq(s.meta.key, "meta")).limit(1);
        return (r[0]?.value as Meta) ?? cloneSeed().meta;
      },
      async set(m) {
        await db.insert(s.meta).values({ key: "meta", value: m }).onConflictDoUpdate({ target: s.meta.key, set: { value: m } });
      },
    },
    async reset() { await seedPostgres(db); },
  };
}
