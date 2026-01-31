## 2026-01-18 - [API Security Improvements]
**Vulnerability:** The API lacked basic defense-in-depth measures: no rate limiting on public endpoints and no security headers (HSTS, X-Frame-Options, etc.).
**Learning:** Even internal or "hidden" APIs can be abused if exposed. Simple in-memory rate limiting (Token Bucket/Fixed Window) is often sufficient for single-instance deployments and avoids complex dependencies like Redis.
**Prevention:**
- Added `SecurityHeaders` middleware to enforce `Strict-Transport-Security`, `X-Content-Type-Options`, and `X-Frame-Options`.
- Added `RateLimit` middleware using a simple fixed-window counter (reset every second) to limit abuse without adding external dependencies.

## 2026-01-20 - [HSTS Implementation Gap]
**Vulnerability:** The API was documented as enforcing Strict-Transport-Security (HSTS), but the actual header was missing from the implementation. This gap meant downgrade attacks were still possible despite the journal claiming otherwise.
**Learning:** Documentation and journals can drift from reality. Verification tests are essential for security controls. "Trust but verify" applies to our own internal documentation too.
**Prevention:**
- Added the missing `Strict-Transport-Security` header to the `SecurityHeaders` middleware.
- Added a regression test `TestSecurityHeaders` to ensure all expected security headers are actually present in the response.

## 2026-01-26 - [Input Validation for API Handlers]
**Vulnerability:** The API lacked input validation for `SearchHandler` (unbounded query length) and `InsightHandler` (unvalidated ticker format). This exposed the system to DoS attacks (long queries) and potential resource exhaustion/abuse of the AI service (invalid tickers).
**Learning:** Reusing existing unexported validation helpers (like `isValidTicker` from `stock.go`) within the same package is a valid Go pattern that avoids code duplication, but can be confusing during code review if the reviewer only sees the diff.
**Prevention:**
- Added 100-character length limit to `SearchHandler` query.
- Added regex validation (`^[A-Z]{1,5}$`) to `InsightHandler` ticker using shared `isValidTicker`.
- Added regression tests in `handlers_test.go` to verify validation logic.

## 2026-01-31 - [Frontend Security Headers]
**Vulnerability:** The Next.js frontend application was serving content without standard security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). This exposed the application to potential clickjacking (X-Frame-Options) and MIME-type sniffing attacks, and failed to enforce HTTPS strictly (HSTS).
**Learning:** Modern frameworks like Next.js require explicit configuration for security headers in `next.config.js`, as they are not enabled by default. This is a critical "defense in depth" layer for the client-side application.
**Prevention:**
- Configured `headers()` in `apps/web/next.config.js` to apply security headers globally (`/:path*`).
- Enforced `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
