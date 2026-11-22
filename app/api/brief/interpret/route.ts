// POST /api/brief/interpret  {brief, campaignId?, advertiser?}  -> text/event-stream (step..., result)
import { interpretBrief } from "@/lib/planning/briefInterpreter";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { brief?: string; campaignId?: string; advertiser?: string };
  const brief = (body.brief ?? "").trim();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        if (brief.length < 10) throw new Error("Write a brief of at least a sentence.");
        for await (const ev of interpretBrief({ brief, campaignId: body.campaignId, advertiser: body.advertiser }, "ui")) {
          send(ev.type, ev);
        }
      } catch (e) {
        send("error", { type: "error", message: e instanceof Error ? e.message : "Interpretation failed" });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", connection: "keep-alive" } });
}
