package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestInsightHandler_Validation(t *testing.T) {
	// We pass nil service because validation should fail before service is called.
	h := NewInsightHandler(nil)
	r := chi.NewRouter()
	r.Get("/insights/{section}", h.GetInsight)

	tests := []struct {
		name       string
		ticker     string
		section    string
		wantStatus int
	}{
		{"Valid ticker", "AAPL", "valuation-summary", 0}, // Panic expected (nil service)
		{"Invalid ticker (too long)", "INVALIDTICKER", "valuation-summary", http.StatusBadRequest},
		{"Invalid ticker (digits)", "AAP1", "valuation-summary", http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					if tt.wantStatus != 0 {
						t.Errorf("Unexpected panic for %s: %v", tt.name, r)
					}
				}
			}()

			req := httptest.NewRequest("GET", "/insights/"+tt.section+"?ticker="+tt.ticker, nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if tt.wantStatus != 0 {
				if w.Code != tt.wantStatus {
					t.Errorf("GetInsight() status = %v, want %v body=%s", w.Code, tt.wantStatus, w.Body.String())
				}
			}
		})
	}
}

func TestSearchHandler_Validation(t *testing.T) {
	h := NewSearchHandler(nil)

	tests := []struct {
		name       string
		query      string
		wantStatus int
	}{
		{"Valid query", "AAPL", 0}, // Expect panic
		{"Too long query", strings.Repeat("A", 101), http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					if tt.wantStatus != 0 {
						t.Errorf("Unexpected panic for %s: %v", tt.name, r)
					}
				}
			}()

			req := httptest.NewRequest("GET", "/api/search?q="+tt.query, nil)
			w := httptest.NewRecorder()

			h.Search(w, req)

			if tt.wantStatus != 0 {
				if w.Code != tt.wantStatus {
					t.Errorf("Search() status = %v, want %v", w.Code, tt.wantStatus)
				}
			}
		})
	}
}
