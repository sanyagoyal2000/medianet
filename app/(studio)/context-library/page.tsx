import { libraryRows } from "@/lib/context/library";
import { contextKpis } from "@/lib/queries";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [rows, kpis] = await Promise.all([libraryRows(), contextKpis()]);
  return <LibraryClient rows={rows} kpis={kpis} initial={{ status: sp.status, site: sp.site, page: sp.page, q: sp.q }} />;
}
