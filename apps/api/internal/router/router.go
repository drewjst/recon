package router

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/recon/api/internal/handler"
)

func New(h *handler.Handler) *chi.Mux {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// Health check
	r.Get("/health", h.Health)

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/stocks", func(r chi.Router) {
			r.Get("/{ticker}", h.GetStock)
			r.Get("/{ticker}/signals", h.GetSignals)
		})
	})

	return r
}
