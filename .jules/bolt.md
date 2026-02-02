# Performance Journal

## Optimization: `SummarySection` Calculation in `TwoStockCompare`
**Date:** 2024-02-02
**Component:** `apps/web/src/components/compare/two-stock-compare.tsx`

### Issue
The `SummarySection` component was recalculating category wins (iterating through all metrics in `COMPARE_METRICS`) on every render. This was synchronous blocking work (approx. 0.05ms - 0.08ms per render) that occurred even if the stock data didn't change.

### Optimization
*   **Logic Extraction:** Extracted the calculation logic into a pure function `calculateCategoryWins`.
*   **Constant Hoisting:** Moved `CATEGORY_NAMES` outside the component to avoid recreation.
*   **Memoization:** Wrapped the calculation in `useMemo`, ensuring it only runs when `left` or `right` stock data references change.

### Verification
*   **Benchmark:** Created `apps/web/src/components/compare/two-stock-compare.test.ts` to measure the cost of the calculation loop (~500-800ms for 10k iterations).
*   **UI:** Verified with Playwright screenshot that the summary table still renders correctly with the optimized logic.

### Learnings
*   Extracting heavy logic to pure functions makes it easier to benchmark and test independently of React rendering.
*   `vitest` in the monorepo required a `vitest.config.ts` to resolve path aliases (`@/`, `@recon/shared`) correctly.
