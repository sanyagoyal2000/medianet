# Phase 07 · Phase 2 AI Channels + ShopBuddy, Phase 3 planned (J5)

**Read first:** spec/04 §6–7, spec/05 J5, `design/06_AI_Channels.png`.

## Build
1. **Partner API:**
   - `POST /api/v1/ai-placements`: requires an `x-ai-app-id` of a registered app; calls Placement Guard; returns a placement or `{placement:null, reason}`; creates an `ai_offers` row and a decision record.
   - `POST /api/v1/ai-placements/display` and `/click`.
2. **`POST /api/shopbuddy/chat`:** the ShopBuddy assistant answers, then the server calls our placement API (internal function call, same logic), passing consent and `recentCardCount`. Returns `{answer, placement|null, reason?}`.
3. **`/shopbuddy` page:** a chat UI, the consent toggle, a typing indicator, and the sponsored card below the answer. It calls `/display` via IntersectionObserver and `/click` on the CTA. The card's "Why this suggestion?" tooltip shows `reasonReader`.
4. **AI Channels page**, matching the screenshot:
   - **Sponsored answers tab:** the Placement rules form (persisted to `ai_rules`); the Answer preview with the Scenario select, Run preview and Preview no-ad response, embedding the same chat components; the Delivery funnel, computed from seed + live offers, so it updates after each run; the note "Returning an offer does not establish an impression."; and the Linked decision card (latest offer, defaulting to AI-2041) with checks + Inspect decision.
   - **Licensed content access tab:** the **Planned** pill, the explainer, and a disabled Join pilot button.
5. Rules changes take effect immediately. For example, removing "Gifts" from allowed contexts makes the shopping scenario return no ad, with the reason "Context not allowed".

## Done when
- Shopping question → card. The offer increments on return; the display increments only after the card is visible.
- Recall, job-loss and no-consent → no card, with a reason.
- `/shopbuddy` works standalone.
- `npm run build` passes. Commit.

→ Tick Phase 07, continue to `phase-08.md`.
