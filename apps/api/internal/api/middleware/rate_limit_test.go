package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRateLimit_IneffectiveWithPorts(t *testing.T) {
	// Limit: 1 request per second
	mw := RateLimit(1)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Request 1: 1.2.3.4:1000
	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "1.2.3.4:1000"
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("Request 1 failed: %v", w1.Code)
	}

	// Request 2: 1.2.3.4:1001 (different port, same IP)
	// Currently, this will be seen as a NEW visitor because the string "1.2.3.4:1000" != "1.2.3.4:1001"
	// So it will return 200 OK.
	// But we WANT it to be 429 Too Many Requests.
	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "1.2.3.4:1001"
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Errorf("Request 2 (diff port) allowed! Status: %v. Expected 429. Rate limit ineffective due to port usage.", w2.Code)
	}
}

func TestRateLimit_WorksWithJustIP(t *testing.T) {
	// This simulates if RealIP middleware ran before and stripped the port, or if RemoteAddr is somehow just an IP.
	// We want to ensure our fix doesn't panic or fail in this case.
	mw := RateLimit(1)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "1.2.3.4" // Just IP
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("Request 1 failed: %v", w1.Code)
	}

    // Request 2 same IP string
    req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "1.2.3.4"
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)

    if w2.Code != http.StatusTooManyRequests {
		t.Errorf("Request 2 allowed! Status: %v. Expected 429.", w2.Code)
	}
}
