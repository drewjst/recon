package handlers

import (
	"net/http"
	"strconv"

	"github.com/drewjst/recon/apps/api/internal/domain/search"
)

const (
	defaultSearchLimit = 10
	maxSearchLimit     = 50
)

// SearchHandler handles ticker search requests.
type SearchHandler struct {
	index *search.Index
}

// NewSearchHandler creates a new search handler with the given search index.
func NewSearchHandler(index *search.Index) *SearchHandler {
	return &SearchHandler{index: index}
}

// SearchResponse represents the search API response.
type SearchResponse struct {
	Results []search.Result `json:"results"`
	Query   string          `json:"query"`
}

// Search handles GET /api/search?q={query} requests.
// Returns matching tickers for autocomplete functionality.
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		writeError(w, http.StatusBadRequest, ErrCodeBadRequest, "Query parameter 'q' is required")
		return
	}

	limit := parseLimit(r.URL.Query().Get("limit"))

	results := h.index.Search(query, limit)

	writeJSON(w, http.StatusOK, SearchResponse{
		Results: results,
		Query:   query,
	})
}

// parseLimit extracts and validates the limit parameter.
func parseLimit(s string) int {
	if s == "" {
		return defaultSearchLimit
	}

	limit, err := strconv.Atoi(s)
	if err != nil || limit < 1 {
		return defaultSearchLimit
	}

	if limit > maxSearchLimit {
		return maxSearchLimit
	}

	return limit
}
