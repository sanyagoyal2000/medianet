// Builds realistic requests (user agents + headers) for each simulated kind.

export const SIM_KINDS = [
  { kind: "human", label: "Human browser", source: "Website", channel: "Web" },
  { kind: "ai_app", label: "AI-app request (ShopBuddy)", source: "ShopBuddy (AI app)", channel: "ShopBuddy" },
  { kind: "crawler", label: "Registered crawler (Web Bot Auth signed)", source: "Registered crawler", channel: "Web" },
  { kind: "buyer", label: "Buyer assistant (MCP)", source: "Buyer assistant", channel: "MCP" },
  { kind: "unknown", label: "Unidentified client", source: "Unidentified", channel: "Web" },
  { kind: "headless", label: "Suspicious headless", source: "Unknown client", channel: "Web" },
] as const;

export type SimKind = (typeof SIM_KINDS)[number]["kind"];

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function b64(seed: string) {
  let out = "";
  let h = 2166136261;
  for (let i = 0; i < 64; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619);
    out += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(h >>> 0) % 64];
  }
  return out + "==";
}

export function buildRequest(kind: SimKind, opts: { created?: number; seed?: string } = {}) {
  const created = opts.created ?? Math.floor(Date.now() / 1000);
  const seed = opts.seed ?? String(created);
  const meta = SIM_KINDS.find((k) => k.kind === kind)!;
  let userAgent = CHROME_UA;
  let headers: Record<string, string> = {};
  switch (kind) {
    case "human":
      headers = {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Chromium";v="131", "Google Chrome";v="131"',
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        referer: "https://www.search.example/",
      };
      break;
    case "ai_app":
      userAgent = "ShopBuddy-Server/2.3 (+https://shopbuddy.example/partners)";
      headers = { "content-type": "application/json", "x-ai-app-id": "shopbuddy", "x-ai-turn-id": `turn_${seed.slice(-6)}` };
      break;
    case "crawler":
      userAgent = "Mozilla/5.0 (compatible; NewsIndexBot/2.1; +https://newsindexbot.example/bot)";
      headers = {
        accept: "text/html",
        "signature-agent": '"https://newsindexbot.example"',
        "signature-input": `sig1=("@authority" "signature-agent");created=${created};expires=${created + 300};keyid="nib-ed25519-2026";alg="ed25519";tag="web-bot-auth"`,
        signature: `sig1=:${b64(seed + "nib")}:`,
      };
      break;
    case "buyer":
      userAgent = "buyer-assistant/1.4 (MCP client)";
      headers = {
        "content-type": "application/json",
        "signature-agent": '"https://buyer-assistant.example"',
        "signature-input": `sig1=("@authority" "signature-agent");created=${created};expires=${created + 300};keyid="buyer-assistant-01";alg="ed25519";tag="web-bot-auth"`,
        signature: `sig1=:${b64(seed + "buyer")}:`,
        "mcp-session": "stateless",
      };
      break;
    case "unknown":
      userAgent = "python-httpx/0.27.0";
      headers = { accept: "*/*" };
      break;
    case "headless":
      userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";
      headers = {
        accept: "*/*",
        "sec-ch-ua": '"HeadlessChrome";v="131"',
        "x-forwarded-for": "203.0.113.7, 198.51.100.4, 192.0.2.44, 203.0.113.90",
      };
      break;
  }
  return { userAgent, headers, source: meta.source, channel: meta.channel as "Web" | "ShopBuddy" | "MCP", kind };
}
