# 04 · Agents, prompts and rules

All agent calls go through `lib/ai/run.ts`:
- **Call:** Anthropic SDK with a 25 s timeout.
- **Validate:** zod-validate the output. On failure, retry once with the validation error appended.
- **Log:** write to `agent_runs`.
- **Fall back to cache:** if `DEMO_MODE=cached`, there is no key, or the call errors or times out, return the cached output from `data/cache/<agent>/<hash>.json` (hash of the normalised input). If there's no exact hit, use the nearest seeded example for that agent. Return `{ data, cached: boolean, latencyMs }`.

Prompts live as Markdown in `lib/ai/prompts/<agent>.md` and are loaded at build time (import as a string). Model IDs are in `lib/ai/models.ts`.

**Cache:** `scripts/build-cache.ts` (`npm run cache:build`) runs every agent over the seeded pages, briefs and scenarios and writes `data/cache/**`. Commit it. If no key is available while building, hand-write realistic cached outputs for every seeded input so cached mode is complete.

---

## 1. Context Profiler (F1) · `claude-haiku-5-5`
**Input:** `{ url, title, text (≤ 6,000 chars), existingTopic }`, where `existingTopic` comes from `contextGraph.topicOf`.

**System prompt:**
```
You label web pages for contextual advertising at Media.net.
The page's TOPIC is already known from ContextGraph; never change it.
Add only:
- purpose: one of buying_guide | product_comparison | how_to | news | safety_report | opinion | entertainment | other
- tone: one of upbeat | practical | neutral | serious | negative | tragic | satirical
- confidence: 0..1 for the tone label
- sensitive: zero or more of recalls | tragedy | layoffs | health | financial_distress | violence | politics
- evidence: for purpose AND tone, quote one exact sentence from the page that supports it (max 25 words each)
Rules: quote only text that appears verbatim in the page. If unsure, lower confidence; never guess.
Return only JSON matching the schema.
```

**Output schema:** `{ purpose, tone, confidence, sensitive: string[], evidence: [{ field: "purpose"|"tone", quote }] }`

**Post-checks in code:**
- If an evidence quote is not a substring of the text (normalise whitespace and quotes), cap confidence at 0.5 and set status to `needs_review`.
- If confidence < 0.6, set status to `needs_review`. Otherwise set it to `fresh`.

## 2. Matching (F1), deterministic: `lib/context/match.ts`
```
evaluate(page, profile, campaign, mode: "context_studio" | "today")
```

**1. Hard rules, in this order.** The first failure means `excluded`, and the reason names the rule.
- topic ∈ `rules.topics` (prefix match on the path) → "Topic not in campaign"
- *(mode `context_studio` only)* `profile.sensitive` ∩ `rules.excludeSensitive` → "Hard exclusion: Product recalls" (human label)
- `page.partnerTier` ≤ `rules.partnerTierMax` → "Partner tier above campaign limit" (outcome label "Partner tier")
- country matches → "Country mismatch"

**2. Soft score:**
```
score = bidCpm × pCTR × (1 + 0.5·relevance + 0.3·toneMatch)
```
- `relevance` = TF-IDF cosine between the page text and the brief
- `toneMatch` = +1 if the tone is in `tonePreference`, 0 if neutral, −0.5 if negative / tragic
- **Tone never excludes. It only ranks.**
- In mode `today`: `score = bidCpm × pCTR`, with no purpose/tone/sensitive checks.

**3. Fallback when there's no profile:** section → domain → "safe-only campaigns". Return `fallbackTier`.

**Returns:** `{ outcome: "eligible"|"excluded"|"partner_tier", reasons: string[], whyMatches: string[], evidence, score, fallbackTier }`

`whyMatches` example: `["Topic: Holiday shopping", "Purpose: Buying guide", "Tone: Upbeat and practical", "No hard exclusion detected"]`

## 3. Explainer (F4) · `claude-haiku-5-5`
**Input:** a decision with its page / profile / campaign / outcome.

**System prompt:**
```
Write two one-sentence explanations of this ad decision.
buyer: name the rule or signal that decided it (e.g. "Excluded: page is a product recall; campaign excludes recalls").
reader: explain only in terms of the page or chat context. Never mention the person, their history, location or device.
Example reader: "Shown because this page is a holiday gift guide. Paid placement."
Return JSON {buyer, reader}.
```

**Code check:** if `reader` matches `/you visited|your history|based on you|near you|your location|your device|you recently/i`, retry once. If it still matches, use the template `"Shown because this page is about {topic}. Paid placement."`.

## 4. Brief Interpreter (F3) · `claude-sonnet-5-5`, tool use, streamed
**Tools** (in `lib/planning/tools.ts`; the MCP endpoint uses the same functions):

| Tool | Returns |
|---|---|
| `contextgraph_topics({query})` | topic paths |
| `find_contexts({spec, limit})` | pages with outcome / reasons (via match.ts) |
| `forecast_reach({spec})` | `{low, high, basis}` |
| `explain_match({pageId, campaignId})` | buyer and reader reasons |
| `create_package({campaignId?, name, spec})` | saves a **draft** (status `draft`), never activates; returns `{campaignId, dealRequestId, status:"draft"}` |

**System prompt:**
```
You turn a media buyer's brief into a Media.net targeting spec.
Separate HARD RESTRICTIONS (sensitive categories to exclude, country, partner tier) from PREFERENCES (tone, purpose).
Map topics only through contextgraph_topics; never invent topic names.
Never invent numbers: call forecast_reach for any estimate.
You may only create DRAFTS with create_package. A human approves activation.
Finish with a JSON block {spec, summary, ambiguities[]} where summary says what you set and excluded.
```

**Streaming:** `POST /api/brief/interpret` returns server-sent events: `step` events with friendly labels ("Reading brief" → "Mapping to ContextGraph" → "Applying hard restrictions" → "Scoring pages" → "Forecasting reach" → "Draft ready"), then a `result` event. The loop runs at most 6 tool turns. In cached mode, replay the cached steps with a 300 ms delay between them.

## 5. Traffic Router (F2), **no LLM**: `lib/traffic/router.ts`

| Request type | Routing decision | Billable | Content access |
|---|---|---|---|
| Human-facing | Advertising checks | Yes, after checks | n/a |
| AI-app request | Confirm actual display | Only after display confirmation | n/a |
| Crawler | Content policy (publisher access) | No | Per publisher policy |
| Buying agent | Planning only | No | No |
| Unknown | Configured review | **Never as human** | No |
| Suspected invalid | Exclude | No | No |

**Classification inputs:**
- `ivtScore` > 0.8 → suspected invalid
- valid Web Bot Auth headers (`Signature-Agent`, `Signature-Input`, `Signature`) whose agent is in `data/seed/agent-registry.json` → crawler or buying agent, per the registry. Label this "verification simulated": check the structure and the registry only.
- `x-ai-app-id` header from a registered partner → AI-app request
- browser user agent + low IVT + no automation flags → human-facing
- otherwise → unknown

**Confidence:** High / Medium / Low.

**Output:** `{ purpose, confidence, decision, billable, contentAccess, audienceExposure, appliedRule, steps: [{label, at: ISO with ms, ok, detail}] }`

It must run in well under 5 ms. Measure with `performance.now()` and show "Routed in 0.4 ms" in the Inspector.

## 6. Placement Guard (Phase 2) · `claude-haiku-5-5` + hard rules
**Input** (from the partner): `{ appId, turnSummary, userConsentAds, recentCardCount }`. It never receives the full conversation.

**Order of checks:**
1. Hard rules in code: app not registered → 403; `!userConsentAds` → `{placement:null, reason:"No ad consent"}`; `recentCardCount ≥ 1` (last 3 turns) → `{placement:null, reason:"Frequency cap"}`.
2. LLM classifies the turn:
   ```
   Classify this chat turn for sponsored-answer eligibility.
   Return {topic, purpose, sensitive[], confidence}.
   ```
   (same taxonomy as the profiler)
3. Code: sensitive is non-empty, or confidence < 0.6, or the topic is not in `ai_rules.contextsAllowed` → `{placement:null, reason}`.
4. Otherwise run match.ts against AI-channel-enabled campaigns → `{ placement:{ offerId, advertiser, headline, body, cta, imageUrl, label:"Sponsored", reasonReader }, displayToken }`. Store an `ai_offers` row with `returned=true`, `displayed=false`.

`POST /api/v1/ai-placements/display {displayToken}` sets displayed = true and makes the offer billable. A click route sets clicked = true. **Returning an offer is not an impression.**

## 7. ShopBuddy assistant (partner side) · `claude-sonnet-5-5`
```
You are ShopBuddy, a friendly shopping helper. Answer in at most 60 words.
Be practical. Never mention specific brands, retailers, ads or sponsors.
```
The ShopBuddy server makes `turnSummary` itself: the last user message, trimmed to 200 chars. Then it calls our placement API.
