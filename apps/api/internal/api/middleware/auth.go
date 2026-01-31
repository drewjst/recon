package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// APIKeyAuth returns middleware that validates API keys.
// If no valid keys are configured, authentication is disabled (passthrough).
// Keys can be provided via X-API-Key header or Authorization: Bearer <key>.
func APIKeyAuth(validKeys []string) func(http.Handler) http.Handler {
	// Build a set for O(1) lookup
	keySet := make(map[string]struct{}, len(validKeys))
	for _, k := range validKeys {
		if k != "" {
			keySet[k] = struct{}{}
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If no keys configured, skip auth (local dev mode)
			if len(keySet) == 0 {
				next.ServeHTTP(w, r)
				return
			}

			// Extract API key from request
			apiKey := extractAPIKey(r)
			if apiKey == "" {
				writeUnauthorized(w, "Missing API key")
				return
			}

			// Validate key using constant-time comparison
			if !isValidKey(apiKey, keySet) {
				writeUnauthorized(w, "Invalid API key")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// extractAPIKey extracts the API key from the request.
// Checks X-API-Key header first, then Authorization: Bearer.
func extractAPIKey(r *http.Request) string {
	// Check X-API-Key header
	if key := r.Header.Get("X-API-Key"); key != "" {
		return key
	}

	// Check Authorization: Bearer <key>
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	return ""
}

// isValidKey checks if the provided key is in the valid set.
// Uses constant-time comparison to prevent timing attacks.
func isValidKey(key string, validKeys map[string]struct{}) bool {
	for validKey := range validKeys {
		if subtle.ConstantTimeCompare([]byte(key), []byte(validKey)) == 1 {
			return true
		}
	}
	return false
}

// writeUnauthorized writes a 401 Unauthorized response.
func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="api"`)
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"code":"UNAUTHORIZED","message":"` + message + `"}`))
}
