# Changelog

All notable changes to Crux are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/) and [Conventional Commits](https://conventionalcommits.org/).

## [1.0.0] - 2026-01-30

### Features

- **Smart Money Deep Dive** — New `/stock/{ticker}/smart-money` page with comprehensive institutional analysis
  - Institutional ownership trends with historical charts
  - Top holders table with position changes
  - Holder type breakdown (hedge funds, mutual funds, etc.)
  - New/closed positions and biggest increases/decreases
  - AI-powered smart money summary
- **Institutional Detail API** — New `/api/stock/{ticker}/institutional` endpoint with full 13F data
- **News Sentiment Analysis** — AI-powered news sentiment with top article links
- **Short Interest Display** — Short interest metrics in Smart Money section
- **Congress Trades** — Senate and House trading disclosures in Smart Money section
- **CruxAI Insights** — AI-powered analysis using Google Vertex AI (Gemini 2.0 Flash)
  - Position Summary, Valuation Summary, Smart Money Summary, News Sentiment
- **DCF Valuation** — Discounted Cash Flow analysis with intrinsic value estimates
- **Owner Earnings** — Buffett-style owner earnings calculation
- **Ticker Search** — ADR support and parallel queries for better results
- **Collapsible Dashboard** — Balance Sheet and Operating Metrics now collapsible
- **Snapshot Sidebar** — Quick stats sidebar on stock pages

### Bug Fixes

- Institutional data availability — use conservative quarter estimates for complete 13F filings
- FMP API field mappings for institutional ownership data
- Congress trade field alignment between backend and frontend
- News AI parsing — strip markdown code blocks before parsing
- AI prompt data accuracy — fixed percentage conversion
- ETF fund overview data and expense ratio display
- Cache error handling — errors now logged instead of silently discarded
- Rate limiter goroutine leak fixed

### Refactoring

- Removed EODHD provider (subscription discontinued)
- Consolidated fiscal quarter calculation utilities
- Project renamed from "Recon" to "Crux"

---

## Previous Releases

Initial release features:
- Stock fundamental analysis with Piotroski F-Score, Rule of 40, Altman Z-Score
- Multi-provider architecture (FMP, Polygon)
- ETF support with holdings and sector breakdown
- Stock comparison tool
- 24-hour PostgreSQL caching
