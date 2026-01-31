package handlers

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/drewjst/crux/apps/api/internal/api/middleware"
	"github.com/drewjst/crux/apps/api/internal/domain/institutional"
)

// InstitutionalHandler handles institutional ownership HTTP requests.
type InstitutionalHandler struct {
	service *institutional.Service
}

// NewInstitutionalHandler creates a new institutional handler.
func NewInstitutionalHandler(service *institutional.Service) *InstitutionalHandler {
	return &InstitutionalHandler{service: service}
}

// GetInstitutionalDetail handles GET /api/stock/{ticker}/institutional requests.
// Returns comprehensive institutional ownership data for the deep dive page.
func (h *InstitutionalHandler) GetInstitutionalDetail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := middleware.GetRequestID(ctx)

	ticker := strings.ToUpper(chi.URLParam(r, "ticker"))

	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format",
			map[string]string{"ticker": ticker},
		)
		return
	}

	result, err := h.service.GetDetail(ctx, ticker)
	if err != nil {
		slog.Error("failed to get institutional detail",
			"error", err,
			"ticker", ticker,
			"request_id", requestID,
		)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError, "Failed to retrieve institutional data")
		return
	}

	if result == nil {
		writeErrorWithDetails(w, http.StatusNotFound, ErrCodeTickerNotFound,
			"Institutional data not available",
			map[string]string{"ticker": ticker},
		)
		return
	}

	writeJSON(w, http.StatusOK, result)
}
