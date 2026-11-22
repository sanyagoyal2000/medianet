# Phase 10 · Polish, README, deploy to Vercel

## 1. Visual pass
For each of the 7 screens: open `design/0X_*.png` and the running page side by side, list every difference (spacing, colour, copy, alignment, missing element), and fix them all. Check:
- empty, loading (skeleton) and error states on every page
- focus rings, keyboard navigation and contrast
- no console errors

## 2. Journey pass
Walk J1–J8 in the browser, in **live** mode (if a key exists) and in **cached** mode (set the cookie in Settings). Fix anything that breaks. Log the result per journey in PROGRESS.md.

## 3. README.md
Include:
- what this is (concept prototype)
- the feature map
- the architecture diagram (text)
- the "existing vs new" table
- env vars
- local setup (`npm i`, `.env.local`, `npm run dev`)
- the optional Neon setup
- MCP connection
- the demo script below

### Demo script (~6 min)
1. **Overview:** "Media.net's workspace with Context Studio switched on."
2. **Campaigns › Holiday Gifting:** Interpret brief → rules fill → gift guide Eligible, toy recall Excluded → toggle Today (topic only): the recall would have run → Why this ad?
3. **Context Library:** paste a live news URL → profile with real evidence.
4. **Inspect request:** a signed crawler → Decision Inspector: content access, no ad billing. Then an unknown → review, never billed as human.
5. **AI Channels:** shopping question → Kohl's card (billable only after display); recall question → no ad.
6. **Reports:** the pilot is honest (not yet conclusive), guardrails hold, ramp is gated.
7. **Claude Desktop over MCP:** the agent saves a draft → it appears in Campaigns as source MCP.

## 4. Deploy (follow spec/06 "Deploy steps")
- Default `DEMO_MODE` to cached when there's no key, so the public URL always works.
- If the user has put `ANTHROPIC_API_KEY` in `.env.local`, add it to Vercel with `vercel env add ANTHROPIC_API_KEY production` (read the value from `.env.local` via the CLI pipe; never print it).
- `vercel --prod --yes`.
- Smoke-check the URL. Write it into PROGRESS.md and the README.

## Done when
- The production URL loads every page.
- All journeys work in cached mode on production.
- PROGRESS.md is fully ticked, with the URL. Final commit.

**Then tell the user:** the URL, which mode is live, and how to add the API key / Neon if they haven't.
