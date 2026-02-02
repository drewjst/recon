package middleware

// VisitorCount exposes the number of visitors for testing purposes.
func (rl *RateLimiter) VisitorCount() int {
	total := 0
	for _, s := range rl.shards {
		s.mu.Lock()
		total += len(s.visitors)
		s.mu.Unlock()
	}
	return total
}
