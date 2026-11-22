/** Reads an NDJSON (or SSE "data:") streaming response, calling onEvent per message. */
export async function readStream<T = Record<string, unknown>>(res: Response, onEvent: (e: T) => void) {
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line || line.startsWith("event:") || line.startsWith(":")) continue;
      const json = line.startsWith("data:") ? line.slice(5).trim() : line;
      try { onEvent(JSON.parse(json) as T); } catch { /* ignore partial */ }
    }
  }
  if (buf.trim()) { try { onEvent(JSON.parse(buf.replace(/^data:/, "").trim()) as T); } catch { /* ignore */ } }
}
