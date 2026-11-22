/* Builds data/cache/** for every agent over the seeded pages, briefs, scenarios and decisions.
   With ANTHROPIC_API_KEY (from .env.local): runs the live agents and stores their outputs.
   Without a key: writes realistic hand-authored outputs so cached mode is complete. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Load .env.local if present (scripts don't get Next's env loading).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

import { SEED } from "../lib/db/seed";
import { hashInput, type CacheEntry } from "../lib/ai/cache";
import { evaluate, corpusIndex } from "../lib/context/match";
import { templateExplanation, ExplainSchema } from "../lib/context/explainer";
import { heuristicInterpret, interpretBrief, BriefResultSchema, type BriefResult } from "../lib/planning/briefInterpreter";
import { ProfileSchema, profilePage, type ProfileOutput } from "../lib/context/profiler";
import { TurnSchema, type TurnClass } from "../lib/aiChannels/placementGuard";
import { runAgent, callText } from "../lib/ai/run";
import { MODELS } from "../lib/ai/models";
import { PROMPTS } from "../lib/ai/prompts";

const LIVE = !!process.env.ANTHROPIC_API_KEY;
const ROOT = join(process.cwd(), "data/cache");
const entries: CacheEntry[] = [];
const add = (agent: string, input: unknown, output: unknown, steps?: CacheEntry["steps"]) =>
  entries.push({ agent, hash: hashInput(input), input, output, ...(steps ? { steps } : {}) });

const KOHLS_BRIEF = SEED.campaigns.find((c) => c.id === "cmp-kohls-holiday-2026")!.brief;
export const EXTRA_BRIEFS = [
  "Wanderly: reach US travelers planning ski weekends and winter trips. Prefer upbeat how-to content. Exclude tragedy and violence.",
  "Northbank: US personal budgeting and credit card comparisons for holiday spending. Practical tone. Exclude financial distress, layoffs and politics.",
];
const SCENARIOS = [
  { key: "shopping", q: "Gift ideas under $50 for my sister who loves cooking" },
  { key: "recall", q: "Is the holiday toy recall affecting my kid's gift?" },
  { key: "jobloss", q: "I just lost my job, how do I budget for holidays?" },
  { key: "screenshot", q: "What are practical holiday gifts under $50?" },
];
const GUARD_AUTHORED: Record<string, TurnClass> = {
  shopping: { topic: "Gifts", purpose: "buying_guide", sensitive: [], confidence: 0.91 },
  recall: { topic: "Gifts", purpose: "safety_report", sensitive: ["recalls"], confidence: 0.93 },
  jobloss: { topic: "Finance", purpose: "how_to", sensitive: ["financial_distress"], confidence: 0.88 },
  screenshot: { topic: "Gifts", purpose: "buying_guide", sensitive: [], confidence: 0.92 },
};
const SHOPBUDDY_AUTHORED: Record<string, string> = {
  shopping: "Lovely! For a cook: an instant-read thermometer, a sharp eight-inch chef's knife, linen kitchen towels or a heavy sheet pan. All under $50, and every one gets used weekly. A handwritten recipe card makes it personal.",
  recall: "Check the tag sewn into the toy for the lot number and compare it with the official recall notice. If it matches, stop using it, remove the batteries and return it for a full refund. If it doesn't match, it's fine to give.",
  jobloss: "I'm sorry, that's a hard time. Pick a total you can cover without credit, then lean on low-cost gifts: baked treats, a shared outing, or a heartfelt note. Telling family you're keeping it simple this year is completely okay.",
  screenshot: "Consider a desk organizer, insulated mug or compact charger.",
};
const AUTHORED_PROFILE_UNCLASSIFIED: ProfileOutput = {
  purpose: "how_to", tone: "practical", confidence: 0.81, sensitive: [],
  evidence: [
    { field: "purpose", quote: "Use this checklist before the ground freezes." },
    { field: "tone", quote: "A few hours of work in late autumn makes spring gardening much easier." },
  ],
};

async function main() {
  console.log(`build-cache: ${LIVE ? "LIVE (calling Claude)" : "OFFLINE (hand-authored outputs)"}`);
  const pages = SEED.pages;
  const profiles = new Map(SEED.profiles.map((p) => [p.pageId, p]));
  const idx = corpusIndex(pages);

  // 1. Context Profiler: every seeded page.
  for (const p of pages) {
    const input = { url: p.url, title: p.title, text: p.text.slice(0, 6000), existingTopic: p.topicPath };
    const prof = profiles.get(p.id)!;
    let out: ProfileOutput;
    if (LIVE) {
      out = (await profilePage(input, "script")).data;
    } else {
      out = prof.status === "unclassified" || !prof.purpose
        ? AUTHORED_PROFILE_UNCLASSIFIED
        : ProfileSchema.parse({ purpose: prof.purpose, tone: prof.tone, confidence: prof.confidence, sensitive: prof.sensitive, evidence: prof.evidence });
    }
    add("contextProfiler", input, out);
  }

  // 2. Explainer: every page × every AI/focus campaign (Why this ad? + explain_match) and seeded decisions.
  const focusIds = ["cmp-kohls-holiday-2026", "cmp-voltmart-holiday-chargers-agent"];
  for (const cid of focusIds) {
    const campaign = SEED.campaigns.find((c) => c.id === cid)!;
    for (const page of pages) {
      const profile = profiles.get(page.id) ?? null;
      const match = evaluate(page, profile, campaign, "context_studio", { idx, siblings: pages.map((pg) => ({ page: pg, profile: profiles.get(pg.id) ?? null })) });
      const input = {
        page: { title: page.title, topic: page.topicPath, purpose: profile?.purpose ?? null, tone: profile?.tone ?? null, sensitive: profile?.sensitive ?? [] },
        campaign: { name: campaign.name, excludes: campaign.rules.excludeSensitive },
        outcome: match.outcome,
        reasons: match.outcome === "eligible" ? match.whyMatches : match.reasons,
      };
      let out = templateExplanation(page, profile, campaign, match);
      if (page.id === "pg-toy-recall" && match.outcome === "excluded") out = { buyer: "Excluded: page is a product recall; campaign excludes recalls.", reader: out.reader };
      if (LIVE) {
        out = (await runAgent({ agent: "explainer", model: MODELS.fast, system: PROMPTS.explainer, input, schema: ExplainSchema, source: "script" })).data;
      }
      add("explainer", input, out);
    }
  }

  // 3. Brief Interpreter: Kohl's + 2 extra briefs.
  for (const brief of [KOHLS_BRIEF, ...EXTRA_BRIEFS]) {
    const input = { brief };
    let result: BriefResult;
    let steps: { label: string; detail?: string }[];
    if (LIVE) {
      steps = [];
      let res: BriefResult | null = null;
      for await (const ev of interpretBrief({ brief }, "ui", { stepDelayMs: 0 })) {
        if (ev.type === "step") steps.push({ label: ev.label, detail: ev.detail });
        else res = ev.data;
      }
      result = BriefResultSchema.parse(res);
    } else {
      const h = await heuristicInterpret(brief);
      steps = h.steps;
      result = h.result;
      if (brief === KOHLS_BRIEF) {
        const k = SEED.campaigns.find((c) => c.id === "cmp-kohls-holiday-2026")!;
        result = {
          spec: { ...k.rules } as BriefResult["spec"],
          summary: "Targets gift guides and product comparisons in Shopping › Gifts, Home & Office and Electronics in the US, preferring practical and upbeat tone. Hard exclusions: product recalls and tragedy. Partner tier ≤ 1.",
          ambiguities: [
            "\"Under $50\" is a price hint; pages aren't priced, so it is kept as a creative and landing-page note, not a page filter.",
            "\"Product comparisons\" could mean any category; mapped to Home & Office and Electronics, where gift-priced comparisons live. Remove a topic to narrow reach.",
          ],
        };
        steps = steps.map((s) =>
          s.label === "Mapping to ContextGraph" ? { ...s, detail: k.rules.topics.join(" · ") } : s,
        );
      }
    }
    add("briefInterpreter", input, result, steps);
  }

  // 4. Placement Guard + 5. ShopBuddy: all scenarios.
  for (const s of SCENARIOS) {
    const gInput = { turnSummary: s.q.slice(0, 200) };
    let cls: TurnClass = GUARD_AUTHORED[s.key];
    let answer = SHOPBUDDY_AUTHORED[s.key];
    if (LIVE) {
      cls = (await runAgent({ agent: "placementGuard", model: MODELS.fast, system: PROMPTS.placementGuard, input: gInput, schema: TurnSchema, source: "script" })).data;
      answer = await callText({ model: MODELS.planner, system: PROMPTS.shopbuddy, messages: [{ role: "user", content: s.q }], maxTokens: 400 });
    }
    add("placementGuard", gInput, cls);
    add("shopbuddy", { last: s.q }, { answer });
  }

  // Write data/cache/<agent>/<hash>.json + index.ts
  for (const d of ["contextProfiler", "explainer", "briefInterpreter", "placementGuard", "shopbuddy"]) rmSync(join(ROOT, d), { recursive: true, force: true });
  const imports: string[] = [];
  const map: Record<string, string[]> = {};
  entries.forEach((e, i) => {
    mkdirSync(join(ROOT, e.agent), { recursive: true });
    writeFileSync(join(ROOT, e.agent, `${e.hash}.json`), JSON.stringify(e, null, 2) + "\n");
    imports.push(`import e${i} from "./${e.agent}/${e.hash}.json";`);
    (map[e.agent] ??= []).push(`    "${e.hash}": e${i} as CacheEntry,`);
  });
  const body = Object.entries(map).map(([a, lines]) => `  ${a}: {\n${lines.join("\n")}\n  },`).join("\n");
  writeFileSync(
    join(ROOT, "index.ts"),
    `// GENERATED by scripts/build-cache.ts (${LIVE ? "live" : "hand-authored offline"}). Do not edit by hand.\nimport type { CacheEntry } from "@/lib/ai/cache";\n${imports.join("\n")}\n\nexport const CACHE: Record<string, Record<string, CacheEntry>> = {\n${body}\n};\n`,
  );
  const counts = Object.fromEntries(Object.entries(map).map(([a, l]) => [a, l.length]));
  console.log("wrote", entries.length, "cache entries", counts);
}

main().catch((e) => { console.error(e); process.exit(1); });
