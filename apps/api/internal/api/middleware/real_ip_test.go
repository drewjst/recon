package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRealIP(t *testing.T) {
	tests := []struct {
		name           string
		headers        map[string]string
		remoteAddr     string
		expectedRemote string
	}{
		{
			name:           "No headers",
			headers:        map[string]string{},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "192.168.1.1",
		},
		{
			name:           "X-Forwarded-For single IP",
			headers:        map[string]string{"X-Forwarded-For": "10.0.0.1"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "10.0.0.1",
		},
		{
			name:           "X-Forwarded-For multiple IPs",
			headers:        map[string]string{"X-Forwarded-For": "10.0.0.1, 10.0.0.2"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "10.0.0.1",
		},
		{
			name:           "X-Forwarded-For invalid IP (string)",
			headers:        map[string]string{"X-Forwarded-For": "malicious-string"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "192.168.1.1", // Should ignore invalid and strip port from real remote
		},
		{
			name:           "X-Forwarded-For invalid IP (with port)",
			headers:        map[string]string{"X-Forwarded-For": "10.0.0.1:8080"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "192.168.1.1", // Should ignore because it expects just IP
		},
		{
			name:           "X-Real-IP valid",
			headers:        map[string]string{"X-Real-IP": "10.0.0.2"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "10.0.0.2",
		},
		{
			name:           "X-Real-IP invalid",
			headers:        map[string]string{"X-Real-IP": "invalid"},
			remoteAddr:     "192.168.1.1:1234",
			expectedRemote: "192.168.1.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a dummy handler that captures the remote addr
			capturedRemote := ""
			nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				capturedRemote = r.RemoteAddr
			})

			handler := RealIP(nextHandler)

			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = tt.remoteAddr
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)

			if capturedRemote != tt.expectedRemote {
				t.Errorf("RemoteAddr = %q, want %q", capturedRemote, tt.expectedRemote)
			}
		})
	}
}
