package handlers

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/drewjst/crux/apps/api/internal/domain/search"
)

const (
	defaultSearchLimit   = 10
	maxSearchLimit       = 50
	maxSearchQueryLength = 100
)

// SearchHandler handles ticker search requests.
type SearchHandler struct {
	searcher *search.PolygonSearcher
}

// NewSearchHandler creates a new search handler with the given Polygon searcher.
func NewSearchHandler(searcher *search.PolygonSearcher) *SearchHandler {
	return &SearchHandler{searcher: searcher}
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

	if len(query) > maxSearchQueryLength {
		writeError(w, http.StatusBadRequest, ErrCodeBadRequest, "Query parameter 'q' is too long")
		return
	}

	limit := parseLimit(r.URL.Query().Get("limit"))

	results, err := h.searcher.Search(r.Context(), query, limit)
	if err != nil {
		slog.Error("search failed", "query", query, "error", err)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError, "Search failed")
		return
	}

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
