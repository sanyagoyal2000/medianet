// POST /api/profile  {url} | {pageId} | {title, text, url?}
// Streams NDJSON progress: Fetching page -> Extracting text -> Profiling with Claude -> Checking evidence -> result.
import { getRepo } from "@/lib/db/repo";
import { extractUrl, ExtractError } from "@/lib/context/extract";
import { upsertPage, profileAndStore } from "@/lib/context/library";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; pageId?: string; title?: string; text?: string };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const repo = await getRepo();
        let page;
        if (body.pageId) {
          page = await repo.pages.get(body.pageId);
          if (!page) throw new ExtractError("Unknown page", "invalid");
          send({ type: "step", label: "Loading stored page", done: true });
        } else if (body.text && body.title) {
          send({ type: "step", label: "Reading pasted text", done: true });
          page = await upsertPage({ url: body.url, title: body.title, text: body.text });
        } else if (body.url) {
          send({ type: "step", label: "Fetching page" });
          const ex = await extractUrl(body.url);
          send({ type: "step", label: "Fetching page", done: true });
          send({ type: "step", label: "Extracting text", done: true, detail: `${ex.text.split(/\s+/).length} words · “${ex.title.slice(0, 60)}”` });
          page = await upsertPage(ex);
        } else {
          throw new ExtractError("Provide a URL, a pageId, or a title and text", "invalid");
        }
        send({ type: "step", label: "Profiling with Claude" });
        const r = await profileAndStore(page);
        send({ type: "step", label: "Profiling with Claude", done: true, detail: r.cached ? "cached / offline profiler" : `${r.latencyMs} ms` });
        send({ type: "step", label: "Checking evidence", done: true, ok: r.evidenceOk, detail: r.evidenceOk ? "Quotes found verbatim in the page" : "Quote not found verbatim · confidence capped, sent to review" });
        send({ type: "result", page, profile: r.profile, cached: r.cached });
      } catch (e) {
        const err = e instanceof ExtractError ? { message: e.message, code: e.code } : { message: "Profiling failed", code: "error" };
        send({ type: "error", ...err });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
