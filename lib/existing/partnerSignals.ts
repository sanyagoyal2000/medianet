// SIMULATED: stands in for Media.net's existing system
// Verification partner: invalid-traffic (IVT) score and declared identity, from user agent and headers.

export type SignalInput = { userAgent: string; headers: Record<string, string> };

const lower = (h: Record<string, string>) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));

export function ivtScore(req: SignalInput): number {
  const ua = req.userAgent.toLowerCase();
  const h = lower(req.headers);
  let score = 0.05;
  if (ua.includes("headlesschrome") || ua.includes("phantomjs") || ua.includes("puppeteer")) score += 0.6;
  if (h["x-forwarded-for"]?.split(",").length > 3) score += 0.15;
  if (!h["accept-language"]) score += 0.12;
  if (h["sec-ch-ua"]?.includes("HeadlessChrome")) score += 0.15;
  if (ua === "" || ua === "-") score += 0.2;
  if (h["signature-agent"]) score = Math.min(score, 0.1);
  return Math.min(0.99, Number(score.toFixed(2)));
}

export function declaredIdentity(req: SignalInput): string {
  const h = lower(req.headers);
  if (h["signature-agent"]) return `Declared agent (${h["signature-agent"].replace(/"/g, "")})`;
  if (h["x-ai-app-id"]) return `AI app (${h["x-ai-app-id"]})`;
  const ua = req.userAgent;
  if (/bot|crawler|spider/i.test(ua)) return "Self-declared bot (unsigned)";
  if (/Mozilla\/5\.0/.test(ua) && !/Headless/i.test(ua)) return "Browser";
  return "None declared";
}
