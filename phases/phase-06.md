# Phase 06 · F2 traffic router, Traffic Intelligence, Decision Inspector (J3, J4)

**Read first:** spec/04 §5, spec/05 J3–J4, `design/04_Traffic_Intelligence.png`, `design/05_Decision_Inspector.png`.

## Build
1. `lib/traffic/router.ts`: deterministic, the policy table as data (`lib/traffic/policies.ts`), Web Bot Auth header structure check + registry lookup, timestamped steps, and the measured routing time.
2. `lib/traffic/simulate.ts`: builds realistic requests for each kind (user agents, headers including `Signature-Agent`/`Signature-Input`/`Signature` for the signed crawler, `x-ai-app-id` for ShopBuddy, high IVT for suspicious headless). Pick a seeded page for each.
3. Routes: `POST /api/requests/simulate`, `GET /api/requests`, `GET /api/decisions/[requestId]`, `PATCH /api/requests/[id]` (reclassify an unknown, with a note).
4. **Traffic Intelligence page**, matching the screenshot: KPIs, a stacked daily bar chart, the automation breakdown + note, request activity (newest first, including simulated ones), the "Unknown does not mean human" card + the Review unknown requests sheet, Billing reconciliation, Routing policies, and the **Inspect request** dialog (also reachable from the Overview header).
5. **Decision Inspector page**, matching the screenshot: request tabs, Request / Context profile / Final decision cards, the timestamped checklist, "Agent identity does not establish human exposure.", "Routed in X ms", the routing rules table with the applied row highlighted, the event log sheet (raw JSON), and Review routing policy.
6. Simulated requests update the KPIs and charts (add them to today's bucket).

## Done when
- Each of the 6 simulated kinds produces the correct decision.
- Unknown and buying-agent requests are never billable.
- The signed crawler shows Content access + "Advertising billing excluded".
- `npm run build` passes. Commit.

→ Tick Phase 06, continue to `phase-07.md`.
