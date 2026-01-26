# Changelog

All notable changes to Recon are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- **CruxAI Insights** — AI-powered analysis using Google Vertex AI (Gemini 2.0 Flash)
  - Position Summary: Executive overview on main stock page with quality signals and key factors
  - Valuation Summary: Deep-dive valuation analysis on valuation page
  - 24-hour caching for generated insights
- **DCF Valuation** — Discounted Cash Flow analysis with intrinsic value estimates
- **Owner Earnings** — Buffett-style owner earnings calculation for quality assessment
- **Ticker search: ADR support** — Search now includes ADR Class C securities (e.g., NVO, TSM, BABA) alongside common stocks and ETFs
- **Ticker search: Parallel queries** — Runs ticker prefix search and fuzzy name search concurrently for better results and faster response

### Fixed
- **AI prompt data accuracy** — Fixed double percentage conversion that showed margins as 100x actual value (e.g., -186% instead of -1.86%)
- **ETF fund overview data** — Fixed all N/A values in ETF fund overview (expense ratio, AUM, NAV, beta, etc.) by correcting FMP type mappings
- **ETF expense ratio display** — SPY now correctly shows 0.0945% instead of 9.45%
- **Header search persistence** — Ticker search in header now remains visible when navigating to `/stock/{ticker}` pages
- **Ticker search accuracy** — "WM" now correctly returns Waste Management as first result
- **CI/CD environment variables** — CruxAI env vars now persist across deployments

### Changed
- **Valuation Metrics UI** — Removed opinionated verdict headline; metrics now stand on their own with clear labels (P/E vs History, P/E vs Sector, PEG Ratio)
- **Home page quick tickers** — Updated to top 7 S&P 500 companies by market cap
- **Default provider** — FMP is now the default and recommended fundamentals provider (EODHD remains as fallback for ETF holdings)

---

## Previous Changes

Initial release features documented in [README.md](./README.md):
- Stock fundamental analysis with Piotroski F-Score, Rule of 40, Altman Z-Score
- Multi-provider architecture (FMP, Polygon, EODHD)
- ETF support with holdings and sector breakdown
- Stock comparison tool
- 24-hour PostgreSQL caching
