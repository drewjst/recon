# Bolt's Journal

## Critical Learnings

## 2024-05-22 - [Lazy Loading Dashboard Sections]
**Learning:** `StockDashboard` is a heavy client component importing many sub-sections. By default, Next.js bundles all imported client components into the parent's chunk. Lazy loading below-the-fold sections using `next/dynamic` significantly reduces the initial bundle size for the dashboard route.
**Action:** Identify large client components that are not immediately visible and lazy load them using `next/dynamic` with named exports handling (`import(...).then(mod => mod.NamedExport)`).
