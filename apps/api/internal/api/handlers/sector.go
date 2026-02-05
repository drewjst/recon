package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/drewjst/crux/apps/api/internal/domain/sector"
)

// SectorHandler handles sector-related HTTP requests.
type SectorHandler struct {
	service *sector.Service
}

// NewSectorHandler creates a new sector handler.
func NewSectorHandler(service *sector.Service) *SectorHandler {
	return &SectorHandler{service: service}
}

// ListSectors handles GET /api/sectors.
// Returns the list of valid sector names.
func (h *SectorHandler) ListSectors(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"sectors": sector.ValidSectors,
	})
}

// GetSectorOverview handles GET /api/sectors/{sector}/overview.
func (h *SectorHandler) GetSectorOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse and validate sector
	rawSector := chi.URLParam(r, "sector")
	sectorName := sector.NormalizeSectorParam(rawSector)

	if !sector.IsValidSector(sectorName) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeBadRequest,
			"Invalid sector name",
			map[string]string{
				"sector":        sectorName,
				"validSectors":  "Technology, Healthcare, Financial Services, Consumer Cyclical, Communication Services, Industrials, Consumer Defensive, Energy, Basic Materials, Real Estate, Utilities",
			},
		)
		return
	}

	// Parse limit
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed < 10 || parsed > 50 {
			writeError(w, http.StatusBadRequest, ErrCodeBadRequest,
				"limit must be an integer between 10 and 50")
			return
		}
		limit = parsed
	}

	// Parse sort
	sortField := "52whigh"
	if s := r.URL.Query().Get("sort"); s != "" {
		if !sector.ValidSortFields[s] {
			writeError(w, http.StatusBadRequest, ErrCodeBadRequest,
				"sort must be one of: 52whigh, ytd, 1y, marketcap, ps, pe")
			return
		}
		sortField = s
	}

	result, err := h.service.GetSectorOverview(ctx, sectorName, limit, sortField)
	if err != nil {
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to fetch sector overview")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
