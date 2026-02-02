package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

// BenchmarkRateLimit_Contention measures the performance of the rate limiter
// under high concurrency with multiple distinct IPs, highlighting mutex contention.
func BenchmarkRateLimit_Contention(b *testing.B) {
	rl := NewRateLimiter(100)
	defer rl.Stop()

	handler := rl.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Pre-generate a pool of IPs to avoid string allocation overhead in the hot loop
	// and ensure we are hitting different keys in the map.
	numIPs := 1000
	ips := make([]string, numIPs)
	for i := 0; i < numIPs; i++ {
		ips[i] = fmt.Sprintf("192.168.%d.%d", i/256, i%256)
	}

	var counter uint64

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		// Each goroutine gets its own recorder to avoid contention on the recorder itself,
		// though httptest.NewRecorder is cheap.
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)

		for pb.Next() {
			// Pick an IP based on a simple counter to ensure distribution
			// We use atomic add to cycle through IPs, or just random.
			// Atomic is better for reproducibility and distribution.
			idx := atomic.AddUint64(&counter, 1)
			req.RemoteAddr = ips[idx%uint64(numIPs)]

			handler.ServeHTTP(w, req)
		}
	})
}
