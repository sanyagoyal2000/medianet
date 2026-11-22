# 02 · Design system

The PNGs in `design/` are the source of truth. Open the relevant one before building each page and match the layout, copy, hierarchy and spacing.

| File | Screen |
|---|---|
| `01_Overview.png` | Overview |
| `02_Campaign_Targeting.png` | Campaigns › Holiday Gifting 2026 › Targeting |
| `03_Context_Library.png` | Context Library |
| `04_Traffic_Intelligence.png` | Traffic Intelligence |
| `05_Decision_Inspector.png` | Decision Inspector |
| `06_AI_Channels.png` | AI Channels › Sponsored answers |
| `07_Reports_and_Experiments.png` | Reports › Performance & experiments |

## Tokens
Put these in `app/globals.css` as CSS variables and map them in `tailwind.config.ts`.

| Token | Value | Use |
|---|---|---|
| `--brand` | `#F14A4B` | Sidebar logo block ("media.net" / "Context Studio") |
| `--primary` | `#EC4E4A`, hover `#D93F3B` | Primary CTAs ("Create campaign", "Review campaign", "Add content source") |
| `--sidebar-from` → `--sidebar-to` | `#7B8794` → `#5F6B78` | Sidebar gradient, with subtle diagonal geometric shading (CSS linear-gradients at 135°, low alpha) |
| `--sidebar-active` | `#515C66` | Active nav item, plus a 4px `--brand` left indicator |
| `--bg` | `#EFF2F6` | Page background |
| `--card` | `#FFFFFF` | Cards: border `#E3E8EF`, radius 10px, shadow `0 1px 2px rgba(16,24,40,.06)` |
| `--text` / `--muted` | `#1D2939` / `#667085` | Text |
| `--link` | `#0F78F1` | Links and outline buttons ("Inspect request", "Interpret brief") |
| `--blue` | `#0169F4` | Blue solid buttons ("Export", "Review routing policy", "Shop now") |
| Green | bg `#DDF3E0`, text `#1E7A2E`, solid `#2EAA3D` | Eligible, Fresh, Ad displayed, High, Passed |
| Amber | bg `#FFF4CE`, text `#8A5A00`, solid `#F6B51E` | Needs review, Awaiting display, Unknown, Low, Current |
| Red | bg `#FDE2E0`, text `#B42318`, solid `#EA5351` | Excluded, Stale, Suspected invalid |
| Blue pill | bg `#E3EEFF`, text `#1849A9` | Human-facing, Info |
| Chart | `#2F6FEB` human-facing · `#1FB58F` automated · `#FFC83D` unknown | Charts |

- **Typography:** Inter (`next/font`). Page title 28px/700; card title 18–20px/700; body 15px; table 14px; KPI number 32px/700.
- **Icons:** lucide-react.

## App shell
- **Left sidebar (240px):**
  - red logo block
  - nav: Overview, Campaigns, Context Library, Traffic Intelligence, Decision Inspector, AI Channels, Reports, Settings
  - disclaimer in small text at the bottom
- **Top bar (white):**
  - "Media.net Workspace" selector
  - "Holiday Gifting 2026" campaign selector
  - "Last 7 days" date range
  - bell (with count), help icon, "SG" avatar
- **Page header:** breadcrumbs, title, subtitle, right-aligned actions.

## Reusable components (`components/studio/*`)
- `KpiCard`
- `Card`
- `StatusPill`: `variant=green|amber|red|blue|grey`
- `DataTable`: sortable, row click, empty and loading states
- `Stepper`: done / current / pending
- `EvidenceQuote`: field label + quoted text with a left border
- `ChipInput`: removable chips
- `PageHeader`
- `CachedChip`: shown when an agent result came from cache
- `AgentStepsStream`: live list of agent steps with spinner / check
- `Drawer` / `Sheet`: used for the request simulator and profile panels

## Quality
- Real buttons, links and labels
- Visible focus rings
- Contrast ≥ 4.5:1
- Skeleton loaders while loading
- Toasts for saves
- Responsive down to 1280px wide (the demo is desktop)
