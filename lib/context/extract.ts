// URL -> {title, text, site}: fetch (8 s timeout, browser UA) -> linkedom -> Readability.
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export class ExtractError extends Error {
  constructor(message: string, public code: "timeout" | "blocked" | "empty" | "invalid") { super(message); }
}

export function normalizeUrl(raw: string) {
  const withProto = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  const u = new URL(withProto);
  if (!/^https?:$/.test(u.protocol)) throw new ExtractError("Only http(s) URLs are supported", "invalid");
  return u;
}

export async function extractUrl(raw: string): Promise<{ url: string; site: string; title: string; text: string }> {
  let u: URL;
  try { u = normalizeUrl(raw); } catch (e) { throw e instanceof ExtractError ? e : new ExtractError("That doesn't look like a URL", "invalid"); }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let html: string;
  try {
    const res = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" } });
    if (!res.ok) throw new ExtractError(`The site returned ${res.status} (paywall or bot protection?)`, "blocked");
    if (!(res.headers.get("content-type") ?? "").includes("html")) throw new ExtractError("The URL is not an HTML page", "invalid");
    html = await res.text();
  } catch (e) {
    if (e instanceof ExtractError) throw e;
    if ((e as Error).name === "AbortError") throw new ExtractError("The page took longer than 8 s to load", "timeout");
    throw new ExtractError("Could not fetch the page", "blocked");
  } finally {
    clearTimeout(timer);
  }
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document, { charThreshold: 300 }).parse();
  const text = (article?.textContent ?? "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  if (text.split(/\s+/).length < 80) throw new ExtractError("Not enough article text found (paywall or script-rendered page?)", "empty");
  const site = u.hostname.replace(/^www\./, "");
  return { url: `${site}${u.pathname.replace(/\/$/, "")}`, site, title: (article?.title || document.title || site).trim().slice(0, 200), text };
}
