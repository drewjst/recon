package middleware

import (
	"context"
	"net"
	"net/http"
	"sync"
	"time"
)

// RateLimiter manages rate limiting state with proper cleanup.
type RateLimiter struct {
	requestsPerSecond int
	visitors          map[string]*visitor
	mu                sync.Mutex
	done              chan struct{}
}

type visitor struct {
	lastSeen time.Time
	count    int
}

// NewRateLimiter creates a new rate limiter that can be properly shut down.
func NewRateLimiter(requestsPerSecond int) *RateLimiter {
	rl := &RateLimiter{
		requestsPerSecond: requestsPerSecond,
		visitors:          make(map[string]*visitor),
		done:              make(chan struct{}),
	}

	// Clean up old visitors periodically
	go rl.cleanup()

	return rl
}

// cleanup runs the periodic visitor cleanup loop.
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-rl.done:
			return
		case <-ticker.C:
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > time.Minute {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}
}

// Stop gracefully shuts down the rate limiter's cleanup goroutine.
func (rl *RateLimiter) Stop() {
	close(rl.done)
}

// Middleware returns the rate limiting middleware handler.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		// Normalize IP by stripping port if present. This prevents memory leaks
		// caused by ephemeral ports creating distinct visitor entries.
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			ip = host
		}

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		if !exists {
			rl.visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		// Reset count if more than a second has passed
		if time.Since(v.lastSeen) > time.Second {
			v.count = 1
			v.lastSeen = time.Now()
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		v.count++
		v.lastSeen = time.Now()

		if v.count > rl.requestsPerSecond {
			rl.mu.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

// RateLimit returns middleware that limits requests per IP address.
// Deprecated: Use NewRateLimiter for proper lifecycle management.
// This function is kept for backward compatibility but leaks a goroutine.
func RateLimit(requestsPerSecond int) func(http.Handler) http.Handler {
	rl := NewRateLimiter(requestsPerSecond)
	return rl.Middleware
}

// RateLimitWithContext returns middleware with proper shutdown support.
func RateLimitWithContext(ctx context.Context, requestsPerSecond int) func(http.Handler) http.Handler {
	rl := NewRateLimiter(requestsPerSecond)

	// Stop cleanup goroutine when context is cancelled
	go func() {
		<-ctx.Done()
		rl.Stop()
	}()

	return rl.Middleware
}
