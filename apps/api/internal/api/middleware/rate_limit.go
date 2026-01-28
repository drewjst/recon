package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// RateLimit returns middleware that limits requests per IP address.
func RateLimit(requestsPerSecond int) func(http.Handler) http.Handler {
	type visitor struct {
		lastSeen time.Time
		count    int
	}

	var (
		mu       sync.Mutex
		visitors = make(map[string]*visitor)
	)

	// Clean up old visitors periodically
	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > time.Minute {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
				ip = host
			}

			mu.Lock()
			v, exists := visitors[ip]
			if !exists {
				visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}

			// Reset count if more than a second has passed
			if time.Since(v.lastSeen) > time.Second {
				v.count = 1
				v.lastSeen = time.Now()
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}

			v.count++
			v.lastSeen = time.Now()

			if v.count > requestsPerSecond {
				mu.Unlock()
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			mu.Unlock()
			next.ServeHTTP(w, r)
		})
	}
}
