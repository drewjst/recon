package middleware

import (
	"context"
	"net"
	"net/http"
	"sync"
	"time"
)

const shardCount = 256

type shard struct {
	mu       sync.Mutex
	visitors map[string]*visitor
}

// RateLimiter manages rate limiting state with proper cleanup.
type RateLimiter struct {
	requestsPerSecond int
	shards            [shardCount]*shard
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
		done:              make(chan struct{}),
	}

	for i := 0; i < shardCount; i++ {
		rl.shards[i] = &shard{
			visitors: make(map[string]*visitor),
		}
	}

	// Clean up old visitors periodically
	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) getShard(ip string) *shard {
	// FNV-1a hash algorithm inline to avoid allocations
	h := uint32(2166136261)
	for i := 0; i < len(ip); i++ {
		h ^= uint32(ip[i])
		h *= 16777619
	}
	return rl.shards[h%shardCount]
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
			for _, s := range rl.shards {
				s.mu.Lock()
				for ip, v := range s.visitors {
					if time.Since(v.lastSeen) > time.Minute {
						delete(s.visitors, ip)
					}
				}
				s.mu.Unlock()
			}
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

		s := rl.getShard(ip)
		s.mu.Lock()

		v, exists := s.visitors[ip]
		if !exists {
			s.visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
			s.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		// Reset count if more than a second has passed
		if time.Since(v.lastSeen) > time.Second {
			v.count = 1
			v.lastSeen = time.Now()
			s.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		v.count++
		v.lastSeen = time.Now()

		if v.count > rl.requestsPerSecond {
			s.mu.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		s.mu.Unlock()
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
