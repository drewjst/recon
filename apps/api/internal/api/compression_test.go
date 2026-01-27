package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCompressionMiddleware(t *testing.T) {
	// Initialize router with empty dependencies
	// We only need the health endpoint which doesn't use services
	router := NewRouter(RouterDeps{
		AllowedOrigins: []string{"*"},
	})

	// Create a request with Accept-Encoding: gzip
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	// Create a recorder
	w := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(w, req)

	// Check headers
	resp := w.Result()
	defer resp.Body.Close()

	// Check if the response is compressed
	if encoding := resp.Header.Get("Content-Encoding"); encoding != "gzip" {
		t.Errorf("Content-Encoding = %q, want %q", encoding, "gzip")
	}

	// Verify content type is still present
	if contentType := resp.Header.Get("Content-Type"); !strings.Contains(contentType, "application/json") {
		t.Errorf("Content-Type = %q, want it to contain application/json", contentType)
	}
}
