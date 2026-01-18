## 2026-01-18 - [API Security Improvements]
**Vulnerability:** The API lacked basic defense-in-depth measures: no rate limiting on public endpoints and no security headers (HSTS, X-Frame-Options, etc.).
**Learning:** Even internal or "hidden" APIs can be abused if exposed. Simple in-memory rate limiting (Token Bucket/Fixed Window) is often sufficient for single-instance deployments and avoids complex dependencies like Redis.
**Prevention:**
- Added `SecurityHeaders` middleware to enforce `Strict-Transport-Security`, `X-Content-Type-Options`, and `X-Frame-Options`.
- Added `RateLimit` middleware using a simple fixed-window counter (reset every second) to limit abuse without adding external dependencies.
