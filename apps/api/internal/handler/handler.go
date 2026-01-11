package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	// Add dependencies here (services, repositories)
}

func New() *Handler {
	return &Handler{}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) GetStock(w http.ResponseWriter, r *http.Request) {
	ticker := chi.URLParam(r, "ticker")

	// TODO: Implement stock lookup
	writeJSON(w, http.StatusOK, map[string]string{
		"ticker":  ticker,
		"message": "not implemented",
	})
}

func (h *Handler) GetSignals(w http.ResponseWriter, r *http.Request) {
	ticker := chi.URLParam(r, "ticker")

	// TODO: Implement signals calculation
	writeJSON(w, http.StatusOK, map[string]string{
		"ticker":  ticker,
		"message": "not implemented",
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
