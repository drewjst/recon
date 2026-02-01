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

## 2026-02-04 - [RealIP Input Validation]
**Vulnerability:** The `RealIP` middleware blindly accepted `X-Forwarded-For` and `X-Real-IP` headers without validation. This allowed attackers to inject arbitrary strings into `r.RemoteAddr`, potentially leading to log injection or resource exhaustion in the `RateLimit` middleware (which uses IP as a map key).
**Learning:** Middleware that modifies global request state (like `RemoteAddr`) must treat all incoming headers as untrusted input. Type safety (expecting an IP) is not enough; explicit validation (`net.ParseIP`) is required.
**Prevention:**
- Modified `RealIP` middleware to validate extracted IPs using `net.ParseIP`.
- Added comprehensive regression tests in `real_ip_test.go` to ensure invalid headers are ignored.

## 2026-02-05 - [Information Leakage in Health Check]
**Vulnerability:** The `/health` endpoint exposed sensitive system metrics (Go version, goroutine count, CPU count) via an unauthenticated `detailed=true` query parameter. This allowed potential attackers to fingerprint the runtime environment and profile the server.
**Learning:** Developers often add "debug" features to public endpoints for convenience, forgetting that these become public interfaces. Health checks should return minimal status (pass/fail), not diagnostics.
**Prevention:**
- Removed `SystemInfo` struct and logic from `HealthHandler`.
- Updated frontend to remove dependency on these metrics.
- Added regression test `TestHealthHandler_NoInfoLeak` to ensure no sensitive fields are returned.
