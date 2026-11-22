# 03 · Data model, simulated systems, seed

## Repository layer
`lib/db/repo.ts` exports one interface (e.g. `repo.pages.list()`, `repo.decisions.create()`), implemented by two adapters:
- `lib/db/postgres.ts`: Drizzle + `@neondatabase/serverless` (`drizzle-orm/neon-http`). Used when `DATABASE_URL` is set.
- `lib/db/memory.ts`: an in-memory store loaded from `data/seed/*.json`, kept on `globalThis` so it survives hot reloads. Used otherwise.

On Vercel without a DB it resets on cold start, which is acceptable for a demo. A `POST /api/admin/reset` route reseeds either adapter.

- `npm run db:push` applies the Drizzle schema to Neon.
- `npm run db:seed` loads `data/seed/*.json` into Neon.
- The seed JSON is **generated once by `scripts/generate-seed.ts`** and committed to the repo.

## Tables / entities

| Entity | Fields |
|---|---|
| `advertisers` | id, name |
| `campaigns` | id, advertiserId, name, status (`draft`\|`in_review`\|`live`), source (`ui`\|`mcp`), brief, rules (json), createdAt, updatedAt |
| `pages` | id, url, site, title, text, topicPath, partnerTier (1–3), country, trafficPerDay |
| `context_profiles` | pageId, purpose, tone, confidence, sensitive (json), evidence (json `[{field, quote}]`), status (`fresh`\|`stale`\|`needs_review`\|`unclassified`), classifiedAt, version |
| `corrections` | id, pageId, field, from, to, note, status (`open`\|`approved`\|`rejected`), createdAt |
| `requests` | id (`RQ1048`…), ts, source, pageId, userAgent, headers (json), ivtScore, declaredIdentity, purpose, confidence, audienceExposure |
| `decisions` | id, requestId, campaignId, outcome, steps (json `[{label, at, ok, detail}]`), appliedRule, billable, contentAccess, reasonBuyer, reasonReader |
| `ai_offers` | id (`AI-2041`…), appId, scenario, turnSummary, campaignId, displayToken, returned, displayed, clicked, reasonReader, createdAt |
| `ai_rules` | appId, format, contextsAllowed (json), frequency, approvedAssetsOnly, disclosure, sensitivePolicy |
| `experiments` | id, name, status, from, to, control (json), treatment (json), guardrails (json), reconciliation (json), rollout (json) |
| `agent_runs` | id, agent, model, source (`ui`\|`mcp`\|`partner`), input (json), output (json), latencyMs, cached, createdAt |
| `daily_traffic` | date, humanFacing, automated, unknown |
| `automation_breakdown` | type, requests, share |

### `campaigns.rules` shape
```ts
{ topics: string[]; purposes: string[]; tonePreference: string[];
  excludeSensitive: string[]; country: string; partnerTierMax: number;
  maxPriceHint?: string }
```

## Simulated existing systems: `lib/existing/*`
Each file starts with `// SIMULATED: stands in for Media.net's existing system`.

| File | What it does |
|---|---|
| `contextGraph.ts` | ~40-node taxonomy, e.g. `Shopping > Gifts > Holiday`, `Shopping > Electronics > Chargers`, `News > Business > Retail`, `Shopping > Product Safety`. `topicsFor(query)` (keyword match) and `topicOf(page)`. |
| `searchSignals.ts` | `intentScore(topicPath)` → 0..1 |
| `dealsDesk.ts` | `forecast(spec)` sums the eligible pages' `trafficPerDay` × 7 × fill 0.82 → `{low, high, basis: "Historical estimate, not guaranteed delivery"}`. Holiday Gifting must give ~2.4M. `createDealRequest(draft)` returns a draft deal id. |
| `partnerSignals.ts` | `ivtScore(req)` and `declaredIdentity(req)`, by user agent / headers |
| `elevate.ts` | experiment conversions, plus `twoProportionCI(c1, n1, c2, n2)` |

## Seed: must reproduce every number in `design/*.png`

**Traffic (16–22 Nov 2026)**
- 1,000,000 total: 840,000 human-facing (84.0%), 110,000 known automation (11.0%), 50,000 unknown (5.0%)
- Daily bars (human-facing / automated / unknown):

  | Day | Human-facing | Automated | Unknown |
  |---|---|---|---|
  | Nov 16 | 121k | 14k | 8k |
  | Nov 17 | 118k | 16k | 7k |
  | Nov 18 | 125k | 15k | 6k |
  | Nov 19 | 119k | 17k | 8k |
  | Nov 20 | 116k | 16k | 7k |
  | Nov 21 | 122k | 17k | 7k |
  | Nov 22 | 119k | 15k | 7k |

  Adjust so the totals are exact.
- Automation breakdown: content retrieval 82,000 (74.5%), buying-agent planning 18,000 (16.4%), other automated 10,000 (9.1%)

**Overview**
- 24 campaigns active
- Fresh context coverage 91.2%
- Contextual delivery shares: buying guides 62%, comparisons 28%, other 10%
- AI channels: 12,400 requests, 8,480 offers, 8,060 displays confirmed, 242 clicks

**Context Library**
- Fresh 91.2%, Needs review 2, Stale 6.1%, Unclassified 2.7%

**Pages:** ≥ 25 realistic pages, each with 150–300 words of believable original text. They must include:

| Page | Site | Purpose / tone | Notes |
|---|---|---|---|
| 20 holiday gifts under $50 | giftguide.example | buying_guide / upbeat | Shopping > Gifts > Holiday |
| Desk upgrades worth buying | worklife.example | product_comparison / practical | |
| Holiday toy recall: 40k gifts pulled | dailynews.example | safety_report / serious | sensitive: recalls; same Holiday topic |
| Best compact chargers | techreview.example | product_comparison / practical | partner tier 2 |
| Satire: Santa unionizes elves | funnypages.example | entertainment / satirical | |
| Retailer cuts 2,000 jobs before holidays | bizwire.example | news / negative | sensitive: layoffs |
| ~19 more | various | various | travel, finance, cooking, tech, parenting, health (one health page flagged sensitive) |

**Requests:** `RQ1048`–`RQ1052` exactly as in `04_Traffic_Intelligence.png`:

| Request | Type | Page | Confidence | Decision |
|---|---|---|---|---|
| RQ1048 | human-facing | gift guide | High | Advertising eligible |
| RQ1049 | crawler | gift guide | High | Content access |
| RQ1050 | AI app request | | Medium | Awaiting display |
| RQ1051 | unknown | | Low | Review required |
| RQ1052 | suspected invalid | | High | Excluded |

Each has a decision with timestamped steps (see `spec/05` J4).

**Overview › Recent delivery decisions**

| Page | Context | Decision |
|---|---|---|
| 20 holiday gifts under $50 | Buying guide | Eligible |
| Holiday toy recall | Safety report | Excluded |
| Desk upgrades worth buying | Comparison | Eligible |
| Best compact chargers | Comparison | Partner tier |

**Experiment "Purpose & tone pilot"** (`07_Reports_and_Experiments.png`)
- Control 50,000 requests / 300 conversions (6.0 per 1k); treatment 50,000 / 315 (6.3 per 1k)
- Added lookup p99 3.2 ms
- CPA $20.00 vs $19.80
- Legitimate traffic filtered 0.4% vs 0.5%
- Fill rate 82.0% vs 81.9%
- Severe unsuitable placements 0
- Revenue reconciliation: +$420, +$1,120, −$180 (as labelled in the screen)
- Rollout: Shadow (done) › Pilot (current) › Ramp (pending)

**Other data**
- Advertisers: Kohl's, Expedia-like travel brand "Wanderly", bank "Northbank", electronics retailer "VoltMart"
- 24 active campaigns in total, plus Kohl's Holiday Gifting 2026 as the focus campaign (status `draft` until reviewed)
- `ai_rules` for ShopBuddy: Format = Sponsored answer card; Context allowed = Shopping, Gifts, Product comparisons; Frequency = max 1 per 3 turns; Approved assets only = on; Disclosure = "Sponsored"; Sensitive or unsuitable → No ad
- `ai_offers`: `AI-2041`, displayed, billable, with checks
