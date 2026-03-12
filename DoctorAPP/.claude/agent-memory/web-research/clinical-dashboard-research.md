# Clinical Dashboard Research Notes
# Date: 2026-02-21

## Research Query
Next.js 15 + Tailwind + Recharts clinical/medical dashboard patterns

## Key Sources
- https://nextjs.org/docs/app/getting-started/project-structure
- https://recharts.github.io/en-US/api/ComposedChart/
- https://recharts.github.io/en-US/api/ReferenceLine/
- https://context7.com/recharts/recharts/llms.txt (via Context7 MCP)
- https://www.sidekickinteractive.com/designing-your-app/uxui-best-practices-for-healthcare-analytics-dashboards/
- https://refine.dev/blog/recharts/
- https://www.tremor.so/
- https://github.com/samuelfuchs/accessible-accordion (WCAG 2.1 AA accordion with Next.js + Tailwind)

## Confirmed: Recharts ComposedChart + Dual YAxis + ReferenceLine
- Use `yAxisId` on both `YAxis` components and all series children
- `ReferenceLine` must also carry `yAxisId` matching the axis it annotates
- `strokeDasharray="3 3"` produces standard dashed threshold lines
- `ReferenceArea` with `fillOpacity` good for "normal range" zones

## Confirmed: Next.js 15 Project Structure
- Feature colocation is the dominant 2025 pattern
- `app/(dashboard)/patients/page.tsx` — route group keeps URL clean
- `app/(dashboard)/patients/_components/VitalsChart.tsx` — private folder for local components
- Server Actions preferred over traditional API routes for mutations
- `loading.tsx` / `error.tsx` per-segment provide granular streaming UX

## Clinical UI Patterns
- F-pattern: primary metrics top-left, secondary top-right, details below
- Delta badges: colored pill with arrow icon + percentage change vs baseline
- Ghost/skeleton charts: pulse-animated placeholder before data loads
- High-contrast palette for WCAG AA: use slate-900 on white, avoid low-contrast grays
- Card grid with consistent padding (p-4 or p-6), subtle border (border-slate-200)
- Status colors: emerald-600 (normal), amber-500 (caution), red-600 (critical)
