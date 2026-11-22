# Phase 01 · Design system and app shell

**Read first:** `spec/02-design-system.md`, `design/01_Overview.png`.

## Build
1. Add the tokens to `globals.css` and `tailwind.config.ts`. Set up the Inter font.
2. **Studio layout** (`app/(studio)/layout.tsx`):
   - the sidebar: red logo block, nav with icons and an active state from the pathname, the diagonal shading, and the disclaimer at the bottom
   - the top bar: workspace / campaign / date selectors as dropdowns, bell with a badge, help, SG avatar
3. Build every reusable component listed in spec/02 under `components/studio/`.
4. Create every studio route as a page with a correct `PageHeader` and an empty card grid, so navigation works. Make `/` redirect to `/overview`.
5. Add a ShopBuddy layout: a neutral teal header "ShopBuddy", no Media.net chrome.
6. Compare against the screenshot: sidebar width, colours, top-bar height, card radius and shadows. Fix the differences.

## Done when
- Every nav item opens its page in the shell.
- The shell visually matches `01_Overview.png` (sidebar, top bar, background, card style).
- `npm run build` passes. Commit.

→ Tick Phase 01, continue to `phase-02.md`.
