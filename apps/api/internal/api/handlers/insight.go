package handlers

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/drewjst/crux/apps/api/internal/application/services"
	"github.com/drewjst/crux/apps/api/internal/domain/models"
)

// InsightHandler handles AI insight requests.
type InsightHandler struct {
	service *services.InsightService
}

// NewInsightHandler creates a new insight handler.
func NewInsightHandler(service *services.InsightService) *InsightHandler {
	return &InsightHandler{service: service}
}

// GetInsight handles GET /api/v1/insights/{section}
func (h *InsightHandler) GetInsight(w http.ResponseWriter, r *http.Request) {
	section := chi.URLParam(r, "section")

	// Validate section
	if !isValidSection(section) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeBadRequest,
			"Invalid insight section",
			map[string]string{"section": section, "valid": "valuation-summary"})
		return
	}

	// Get required ticker
	ticker := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("ticker")))
	if ticker == "" {
		writeError(w, http.StatusBadRequest, ErrCodeBadRequest, "ticker query parameter is required")
		return
	}

	// Validate ticker format
	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format",
			map[string]string{"ticker": ticker},
		)
		return
	}

	// Build request
	req := models.InsightRequest{
		Ticker:  ticker,
		Section: models.InsightSection(section),
	}

	// Extract optional year/quarter for future earnings section
	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			req.Year = year
		}
	}
	if quarterStr := r.URL.Query().Get("quarter"); quarterStr != "" {
		if quarter, err := strconv.Atoi(quarterStr); err == nil {
			req.Quarter = quarter
		}
	}

	// Log request
	slog.Info("insight request",
		"ticker", ticker,
		"section", section,
	)

	// Call service
	resp, err := h.service.GetInsight(r.Context(), req)
	if err != nil {
		slog.Error("failed to generate insight",
			"error", err,
			"ticker", ticker,
			"section", section,
		)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to generate insight")
		return
	}

	// Log cache status
	slog.Info("insight generated",
		"ticker", ticker,
		"section", section,
		"cached", resp.Cached,
	)

	writeJSON(w, http.StatusOK, resp)
}

// isValidSection checks if the section is a known insight section.
func isValidSection(section string) bool {
	s := models.InsightSection(section)
	return s.IsValid()
}
