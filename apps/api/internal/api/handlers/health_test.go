package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler_NoInfoLeak(t *testing.T) {
	h := NewHealthHandler(nil)

	// Even with detailed=true, it should NOT return system info
	req := httptest.NewRequest("GET", "/health?detailed=true", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if _, ok := resp["system"]; ok {
		t.Error("Expected 'system' field to be ABSENT in response")
	}
}
