package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// BenchmarkRateLimit_VaryingPorts measures performance when requests come from the same IP but different ports.
// It also verifies that the visitor count remains 1, proving the memory leak fix.
func BenchmarkRateLimit_VaryingPorts(b *testing.B) {
	// High limit to focus on map access/parsing rather than limiting logic
	rl := NewRateLimiter(1000000)
	defer rl.Stop()

	handler := rl.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Simulate different ephemeral ports
		req.RemoteAddr = fmt.Sprintf("192.168.1.1:%d", 1024+(i%60000))

		// Reset recorder
		w = httptest.NewRecorder()

		handler.ServeHTTP(w, req)
	}

	// Stop timer to check verification
	b.StopTimer()

	if count := rl.VisitorCount(); count != 1 {
		b.Errorf("Expected 1 visitor (IP based), got %d. Memory leak detected!", count)
	}
}
