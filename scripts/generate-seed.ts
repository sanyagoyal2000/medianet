/* Generates data/seed/*.json. Run once (npm run seed:generate) and commit the output.
   Every number here reproduces the reference screens in design/*.png. */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SEED_PAGES } from "./seed-pages";
import type {
  Advertiser, AgentRun, AiOffer, AiRules, Campaign, CampaignRules, ContextProfile, Decision, DailyTraffic,
  AutomationRow, Experiment, Meta, Page, TrafficRequest,
} from "../lib/types";
import { buildRequest, type SimKind } from "../lib/traffic/simulate";
import { route } from "../lib/traffic/router";
import { corpusIndex, evaluate } from "../lib/context/match";
import { forecast } from "../lib/existing/dealsDesk";

const OUT = join(process.cwd(), "data/seed");
mkdirSync(OUT, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2) + "\n");

const NOW = Date.parse("2026-11-22T14:10:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const hoursAgo = (h: number) => iso(NOW - h * 3600_000);
const norm = (s: string) => s.replace(/\s+/g, " ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

// ---------- advertisers ----------
const advertisers: Advertiser[] = [
  { id: "adv-kohls", name: "Kohl's" },
  { id: "adv-wanderly", name: "Wanderly" },
  { id: "adv-northbank", name: "Northbank" },
  { id: "adv-voltmart", name: "VoltMart" },
];

// ---------- pages + profiles ----------
const shortTitles: Record<string, string> = {
  "pg-gift-guide": "Gift guide", "pg-toy-recall": "Toy recall", "pg-desk-upgrades": "Desk upgrades", "pg-chargers": "Compact chargers",
};
const pages: (Page & { shortTitle?: string })[] = SEED_PAGES.map((p) => ({
  id: p.id, url: p.url, site: p.site, title: p.title, text: p.text.trim(), topicPath: p.topicPath,
  partnerTier: p.partnerTier, country: p.country, trafficPerDay: p.trafficPerDay,
  ...(shortTitles[p.id] ? { shortTitle: shortTitles[p.id] } : {}),
}));

const profiles: ContextProfile[] = SEED_PAGES.map((p) => {
  const evidence = [] as ContextProfile["evidence"];
  if (p.evPurpose) evidence.push({ field: "purpose", quote: p.evPurpose });
  if (p.evTone) evidence.push({ field: "tone", quote: p.evTone });
  for (const e of evidence) {
    if (!norm(p.text).includes(norm(e.quote))) throw new Error(`Evidence not verbatim in ${p.id}: ${e.quote}`);
    if (e.quote.split(/\s+/).length > 25) throw new Error(`Evidence >25 words in ${p.id}`);
  }
  const words = p.text.trim().split(/\s+/).length;
  if (words < 150 || words > 300) throw new Error(`${p.id} has ${words} words (need 150–300)`);
  return {
    pageId: p.id, purpose: (p.purpose as ContextProfile["purpose"]) ?? null, tone: (p.tone as ContextProfile["tone"]) ?? null,
    confidence: p.confidence, sensitive: p.sensitive as ContextProfile["sensitive"], evidence, status: p.status,
    classifiedAt: p.status === "unclassified" ? "" : hoursAgo(p.classifiedHoursAgo), version: 1,
  };
});

// ---------- campaigns ----------
const created = (d: number) => iso(NOW - d * 86400_000);
const KOHLS_BRIEF =
  "Find US gift guides and product comparisons under $50. Prefer practical, upbeat content. Exclude product recalls and tragedy.";
const kohlsRules: CampaignRules = {
  topics: ["Shopping > Gifts", "Shopping > Home & Office", "Shopping > Electronics"],
  purposes: ["buying_guide", "product_comparison"],
  tonePreference: ["practical", "upbeat"],
  excludeSensitive: ["recalls", "tragedy"],
  country: "US",
  partnerTierMax: 1,
  maxPriceHint: "$50",
};
const focus: Campaign = {
  id: "cmp-kohls-holiday-2026", advertiserId: "adv-kohls", name: "Holiday Gifting 2026", status: "draft", source: "ui",
  brief: KOHLS_BRIEF, rules: kohlsRules, budget: "$180,000", flight: "24 Nov – 24 Dec 2026", bidCpm: 6.5, aiChannels: true,
  dealRequestId: null, createdAt: created(3), updatedAt: hoursAgo(2),
};

type LiveDef = [string, string, Partial<CampaignRules>, number];
const live: LiveDef[] = [
  ["adv-kohls", "Black Friday Doorbusters", { topics: ["Shopping > Deals", "Shopping > Electronics"], purposes: ["buying_guide", "product_comparison"] }, 7.2],
  ["adv-kohls", "Gift Cards Always-On", { topics: ["Shopping > Gifts"], purposes: ["buying_guide", "opinion"] }, 4.1],
  ["adv-kohls", "Winter Coats Clearance", { topics: ["Shopping"], purposes: ["buying_guide"] }, 5.0],
  ["adv-kohls", "Home Refresh Season", { topics: ["Shopping > Home & Office", "Shopping > Home & Kitchen"], purposes: ["product_comparison", "how_to"] }, 5.6],
  ["adv-kohls", "Beauty Holiday Sets", { topics: ["Shopping > Gifts"], purposes: ["buying_guide"] }, 5.9],
  ["adv-kohls", "Kids Toys Q4", { topics: ["Shopping > Gifts > Kids"], purposes: ["buying_guide"], excludeSensitive: ["recalls", "tragedy", "violence"] }, 6.0],
  ["adv-wanderly", "Ski Season Getaways", { topics: ["Travel > Winter Trips"], purposes: ["how_to", "buying_guide"] }, 6.8],
  ["adv-wanderly", "Holiday Flights Flex", { topics: ["Travel > Flights"], purposes: ["how_to", "news"] }, 7.5],
  ["adv-wanderly", "Spring Break Early Bird", { topics: ["Travel"], purposes: ["how_to"] }, 4.4],
  ["adv-wanderly", "Hotels Last-Minute", { topics: ["Travel > Hotels"], purposes: ["product_comparison", "how_to"] }, 5.2],
  ["adv-wanderly", "Weekend City Breaks", { topics: ["Travel"], purposes: ["how_to", "buying_guide"] }, 4.9],
  ["adv-northbank", "Holiday Budgeting Tools", { topics: ["Finance > Personal Budgeting"], purposes: ["how_to"], excludeSensitive: ["financial_distress", "tragedy"] }, 8.4],
  ["adv-northbank", "Cashback Card Q4", { topics: ["Finance > Credit Cards"], purposes: ["product_comparison"], excludeSensitive: ["financial_distress"] }, 11.0],
  ["adv-northbank", "Savings Goals 2027", { topics: ["Finance"], purposes: ["how_to"], excludeSensitive: ["financial_distress"] }, 6.3],
  ["adv-northbank", "First-Home Saver", { topics: ["Finance"], purposes: ["how_to", "news"], excludeSensitive: ["financial_distress", "layoffs"] }, 7.7],
  ["adv-northbank", "Student Banking", { topics: ["Finance"], purposes: ["how_to"], excludeSensitive: ["financial_distress"] }, 5.1],
  ["adv-voltmart", "Compact Chargers Always-On", { topics: ["Shopping > Electronics > Chargers"], purposes: ["product_comparison", "buying_guide"], partnerTierMax: 2 }, 5.4],
  ["adv-voltmart", "Earbuds Holiday Push", { topics: ["Shopping > Electronics > Audio"], purposes: ["product_comparison"] }, 5.8],
  ["adv-voltmart", "Laptop Season", { topics: ["Shopping > Electronics > Computers"], purposes: ["product_comparison", "opinion"], partnerTierMax: 2 }, 6.9],
  ["adv-voltmart", "Smart Home Starter", { topics: ["Shopping > Electronics", "Technology"], purposes: ["how_to", "product_comparison"] }, 5.3],
  ["adv-voltmart", "Gaming Accessories", { topics: ["Shopping > Electronics"], purposes: ["product_comparison"] }, 4.8],
  ["adv-voltmart", "TV Upgrade Week", { topics: ["Shopping > Electronics"], purposes: ["buying_guide", "product_comparison"] }, 6.1],
  ["adv-voltmart", "Phone Accessories", { topics: ["Technology > Phones", "Shopping > Electronics"], purposes: ["product_comparison"] }, 4.6],
  ["adv-voltmart", "Camera & Creator Kits", { topics: ["Shopping > Electronics"], purposes: ["buying_guide", "how_to"] }, 5.5],
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const liveCampaigns: Campaign[] = live.map(([adv, name, r, cpm], i) => ({
  id: `cmp-${adv.replace("adv-", "")}-${slug(name)}`,
  advertiserId: adv, name, status: "live", source: "ui",
  brief: "", bidCpm: cpm, aiChannels: false, dealRequestId: `DR-${3200 + i}`,
  rules: {
    topics: r.topics ?? ["Shopping"], purposes: r.purposes ?? [], tonePreference: r.tonePreference ?? ["practical"],
    excludeSensitive: r.excludeSensitive ?? ["recalls", "tragedy"], country: "US", partnerTierMax: r.partnerTierMax ?? 1,
  },
  createdAt: created(20 + i), updatedAt: created(2 + (i % 9)),
}));
const mcpDraft: Campaign = {
  id: "cmp-voltmart-holiday-chargers-agent", advertiserId: "adv-voltmart", name: "Holiday Chargers (agent draft)", status: "draft", source: "mcp",
  brief: "US product comparisons and buying guides for compact chargers and earbuds. Exclude recalls. Partner tier up to 2.",
  bidCpm: 5.2, aiChannels: false, dealRequestId: "DR-4187",
  rules: {
    topics: ["Shopping > Electronics"], purposes: ["product_comparison", "buying_guide"], tonePreference: ["practical"],
    excludeSensitive: ["recalls"], country: "US", partnerTierMax: 2,
  },
  createdAt: hoursAgo(5), updatedAt: hoursAgo(5),
};
const campaigns = [focus, mcpDraft, ...liveCampaigns];
if (liveCampaigns.length !== 24) throw new Error("need 24 live campaigns");

// ---------- requests + decisions (built with the real router) ----------
const pageById = new Map(pages.map((p) => [p.id, p]));
const profById = new Map(profiles.map((p) => [p.pageId, p]));
const idx = corpusIndex(pages);

const reqDefs: { id: string; kind: SimKind; ts: string; pageId: string | null; shortCtx?: string; gap?: number }[] = [
  { id: "RQ1041", kind: "unknown", ts: "2026-11-22T13:31:12.408Z", pageId: "pg-stocking-stuffers" },
  { id: "RQ1042", kind: "human", ts: "2026-11-22T13:36:40.122Z", pageId: "pg-desk-upgrades" },
  { id: "RQ1043", kind: "unknown", ts: "2026-11-22T13:42:05.931Z", pageId: "pg-earbuds" },
  { id: "RQ1044", kind: "human", ts: "2026-11-22T13:45:18.560Z", pageId: "pg-chargers" },
  { id: "RQ1045", kind: "crawler", ts: "2026-11-22T13:47:51.017Z", pageId: "pg-toy-recall" },
  { id: "RQ1046", kind: "human", ts: "2026-11-22T13:48:33.284Z", pageId: "pg-stocking-stuffers" },
  { id: "RQ1047", kind: "ai_app", ts: "2026-11-22T13:49:10.775Z", pageId: null },
  { id: "RQ1048", kind: "human", ts: "2026-11-22T13:50:41.213Z", pageId: "pg-gift-guide", gap: 1100 },
  { id: "RQ1049", kind: "crawler", ts: "2026-11-22T13:51:02.204Z", pageId: "pg-gift-guide", gap: 5000 },
  { id: "RQ1050", kind: "buyer", ts: "2026-11-22T13:52:10.640Z", pageId: null },
  { id: "RQ1051", kind: "unknown", ts: "2026-11-22T13:52:48.091Z", pageId: "pg-gift-guide", gap: 900 },
  { id: "RQ1052", kind: "headless", ts: "2026-11-22T13:53:30.452Z", pageId: "pg-gift-guide" },
  { id: "RQ1053", kind: "ai_app", ts: "2026-11-22T14:04:12.318Z", pageId: null, shortCtx: "Shopping question" },
  { id: "RQ1054", kind: "crawler", ts: "2026-11-22T14:05:03.870Z", pageId: "pg-gift-guide" },
  { id: "RQ1055", kind: "human", ts: "2026-11-22T14:06:20.115Z", pageId: "pg-toy-recall" },
  { id: "RQ1056", kind: "human", ts: "2026-11-22T14:07:45.733Z", pageId: "pg-gift-guide" },
];

const requests: TrafficRequest[] = [];
const decisions: Decision[] = [];
const ROUTED_MS: Record<string, number> = { RQ1048: 0.42, RQ1049: 0.38, RQ1051: 0.31 };
for (const d of reqDefs) {
  const created = Math.floor(Date.parse(d.ts) / 1000);
  const b = buildRequest(d.kind, { created, seed: d.id });
  const page = d.pageId ? pageById.get(d.pageId)! : null;
  const r = route(
    { id: d.id, ts: d.ts, userAgent: b.userAgent, headers: b.headers, pageId: d.pageId },
    { page, profile: d.pageId ? profById.get(d.pageId) : null, campaign: focus, idx, stepGapMs: d.gap ?? 700 },
  );
  requests.push({
    id: d.id, ts: d.ts, source: b.source, pageId: d.pageId, userAgent: b.userAgent, headers: b.headers,
    ivtScore: r.ivtScore, declaredIdentity: r.identityLabel, purpose: r.purpose, confidence: r.confidence,
    audienceExposure: r.audienceExposure, channel: b.channel, kind: d.kind,
    ...(d.shortCtx ? { contextLabel: d.shortCtx } : {}),
    review: r.purpose === "unknown" ? { status: "open" } : null,
  } as TrafficRequest);
  decisions.push({ id: `DEC-${d.id}`, requestId: d.id, ...r.decision, routedMs: ROUTED_MS[d.id] ?? Number((0.28 + (created % 17) / 100).toFixed(2)) });
}

// ---------- AI channels ----------
const aiRules: AiRules[] = [{
  appId: "shopbuddy",
  format: "Sponsored answer card",
  contextsAllowed: ["Shopping", "Gifts", "Product comparisons"],
  frequency: "Max 1 per 3 turns",
  approvedAssetsOnly: true,
  disclosure: "Sponsored",
  sensitivePolicy: "No ad",
}];
const aiOffers: AiOffer[] = [{
  id: "AI-2041", appId: "shopbuddy", scenario: "shopping", turnSummary: "What are practical holiday gifts under $50?",
  campaignId: focus.id, displayToken: "dt_seed_2041", returned: true, displayed: true, clicked: false,
  reasonReader: "Matched to this gift-shopping question. Paid placement.", reason: null,
  checks: [
    { label: "Consent to sponsored suggestions", ok: true },
    { label: "Relevant context matched (Gifts)", ok: true },
    { label: "Not sensitive", ok: true },
    { label: "Frequency within cap", ok: true },
    { label: "Approved assets available", ok: true },
    { label: "Display confirmation received", ok: true },
    { label: "Billable", ok: true },
  ],
  createdAt: "2026-11-22T14:04:12.900Z",
}];

// ---------- traffic aggregates (exact totals from 04_Traffic_Intelligence.png) ----------
const dailyTraffic: DailyTraffic[] = [
  ["2026-11-16", 118400, 15200, 7400], ["2026-11-17", 120120, 15730, 7150], ["2026-11-18", 121800, 16100, 7100],
  ["2026-11-19", 123480, 16170, 7350], ["2026-11-20", 121800, 15950, 7250], ["2026-11-21", 117600, 15290, 7110],
  ["2026-11-22", 116800, 15560, 6640],
].map(([date, h, a, u]) => ({ date: date as string, humanFacing: h as number, automated: a as number, unknown: u as number }));
const sum = (k: keyof DailyTraffic) => dailyTraffic.reduce((s, d) => s + (d[k] as number), 0);
if (sum("humanFacing") !== 840000 || sum("automated") !== 110000 || sum("unknown") !== 50000) throw new Error("traffic totals off");

const automation: AutomationRow[] = [
  { type: "Content retrieval", requests: 82000, share: 0.745 },
  { type: "Buying-agent planning", requests: 18000, share: 0.164 },
  { type: "Other automation", requests: 10000, share: 0.091 },
];

// ---------- experiment ----------
const experiments: Experiment[] = [{
  id: "exp-purpose-tone-pilot",
  name: "Purpose & tone pilot",
  status: "running",
  from: "2026-11-16", to: "2026-11-22",
  control: { requests: 50000, conversions: 300, cpa: 20.0, filtered: 0.4, fill: 82.0 },
  treatment: { requests: 50000, conversions: 315, cpa: 19.8, filtered: 0.5, fill: 81.9, p99Ms: 3.2, severe: 0 },
  guardrails: [
    { metric: "Advertiser CPA", control: "$20.00", treatment: "$19.80", status: "passed", label: "Within tolerance" },
    { metric: "p99 added latency", control: "—", treatment: "3.2 ms", status: "passed", label: "Within configured 5ms" },
    { metric: "Severe unsuitable placements", control: "0", treatment: "0", status: "passed", label: "No incident observed" },
    { metric: "Legitimate activity filtered", control: "0.4%", treatment: "0.5%", status: "passed", label: "Within configured tolerance" },
    { metric: "Fill rate", control: "82.0%", treatment: "81.9%", status: "watch", label: "Review trend" },
  ],
  reconciliation: [
    { label: "Contextual uplift", amount: 420, detail: "Incremental revenue on treatment placements vs. control, same campaigns." },
    { label: "Recovered inventory", amount: 1120, detail: "Pages previously blocked by topic-level keyword lists that passed purpose & tone checks." },
    { label: "Removed invalid activity", amount: -180, detail: "Unknown and suspected-invalid requests no longer billed as human." },
  ],
  rollout: [
    { stage: "Shadow", state: "done" },
    { stage: "Pilot", state: "current" },
    { stage: "Ramp", state: "pending" },
  ],
}];

// ---------- agent runs (history) ----------
const agentRuns: AgentRun[] = [
  { id: "run-0001", agent: "contextProfiler", model: "claude-haiku-5-5", source: "ui", input: { pageId: "pg-gift-guide" },
    output: { purpose: "buying_guide", tone: "upbeat", confidence: 0.84 }, latencyMs: 1180, cached: false, createdAt: hoursAgo(2) },
  { id: "run-0002", agent: "contextProfiler", model: "claude-haiku-5-5", source: "ui", input: { pageId: "pg-toy-recall" },
    output: { purpose: "safety_report", tone: "serious", confidence: 0.58, sensitive: ["recalls"] }, latencyMs: 1320, cached: false, createdAt: hoursAgo(1) },
  { id: "run-0003", agent: "mcp:find_contexts", model: "deterministic", source: "mcp",
    input: { spec: { topics: ["Shopping > Electronics"], excludeSensitive: ["recalls"] } }, output: { eligible: 3, excluded: 2 }, latencyMs: 41, cached: false, createdAt: hoursAgo(5.1) },
  { id: "run-0004", agent: "mcp:forecast_reach", model: "deterministic", source: "mcp",
    input: { spec: { topics: ["Shopping > Electronics"] } }, output: { low: 520000, high: 640000, basis: "Historical estimate, not guaranteed delivery" }, latencyMs: 12, cached: false, createdAt: hoursAgo(5.05) },
  { id: "run-0005", agent: "mcp:create_package", model: "deterministic", source: "mcp",
    input: { name: "Holiday Chargers (agent draft)" }, output: { campaignId: mcpDraft.id, dealRequestId: "DR-4187", status: "draft" }, latencyMs: 18, cached: false, createdAt: hoursAgo(5) },
  { id: "run-0006", agent: "placementGuard", model: "claude-haiku-5-5", source: "partner",
    input: { appId: "shopbuddy", turnSummary: "What are practical holiday gifts under $50?" }, output: { topic: "Gifts", purpose: "buying_guide", sensitive: [], confidence: 0.91 },
    latencyMs: 640, cached: false, createdAt: "2026-11-22T14:04:12.700Z" },
];

// ---------- meta: inventory baselines so KPIs reproduce the screens ----------
const count = (s: string) => profiles.filter((p) => p.status === s).length;
const meta: Meta = {
  coverageBaseline: {
    fresh: 912000 - count("fresh"),
    stale: 61000 - count("stale"),
    unclassified: 27000 - count("unclassified") - count("needs_review"),
    needs_review: 0,
  },
  aiFunnelBaseline: { requests: 12400 - 1, offers: 8480 - 1, displays: 8060 - 1, clicks: 242 },
  contextualDelivery: {
    rows: [
      { context: "Buying guides", share: 62 },
      { context: "Product comparisons", share: 28 },
      { context: "Other eligible content", share: 10 },
    ],
    trend: [
      { date: "16 Nov", share: 56 }, { date: "17 Nov", share: 57 }, { date: "18 Nov", share: 56 }, { date: "19 Nov", share: 57.5 },
      { date: "20 Nov", share: 58 }, { date: "21 Nov", share: 60 }, { date: "22 Nov", share: 61 },
    ],
  },
  activeCampaignsBaseline: 0,
};

write("advertisers", advertisers);
write("campaigns", campaigns);
write("pages", pages);
write("context_profiles", profiles);
write("corrections", []);
write("requests", requests);
write("decisions", decisions);
write("ai_offers", aiOffers);
write("ai_rules", aiRules);
write("experiments", experiments);
write("agent_runs", agentRuns);
write("daily_traffic", dailyTraffic);
write("automation_breakdown", automation);
write("meta", meta);

// ---------- sanity output ----------
const elig = pages
  .map((p) => ({ p, m: evaluate(p, profById.get(p.id), focus, "context_studio", { idx }) }))
  .filter((x) => x.m.outcome === "eligible");
const fc = forecast({ pages: elig.map((x) => x.p) });
console.log(`pages=${pages.length} campaigns(live)=${liveCampaigns.length} requests=${requests.length}`);
console.log(`eligible for Kohl's: ${elig.map((x) => x.p.id).join(", ")}`);
console.log(`forecast point=${fc.point} (${(fc.point / 1e6).toFixed(1)}M)`);
for (const r of requests) {
  const d = decisions.find((x) => x.requestId === r.id)!;
  console.log(`${r.id} ${r.purpose.padEnd(17)} ${r.confidence.padEnd(6)} ${d.outcome.padEnd(18)} billable=${d.billable}`);
}
