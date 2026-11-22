// Loads data/seed/*.json into Neon Postgres. Run `npm run db:push` first.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { seedPostgres } from "../lib/db/postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (e.g. in .env.local and run with `node --env-file=.env.local`)");
  await seedPostgres(drizzle(neon(url)));
  console.log("Seeded Postgres from data/seed/*.json");
}
main().catch((e) => { console.error(e); process.exit(1); });
