// Package api provides HTTP routing and request handling.
package api

import (
	"github.com/go-chi/chi/v5"

	"github.com/drewjst/recon/apps/api/internal/api/handlers"
	"github.com/drewjst/recon/apps/api/internal/api/middleware"
	"github.com/drewjst/recon/apps/api/internal/domain/search"
	"github.com/drewjst/recon/apps/api/internal/domain/stock"
)

// RouterDeps contains all dependencies needed by the router.
type RouterDeps struct {
	StockService   *stock.Service
	SearchIndex    *search.Index
	AllowedOrigins []string
}

// NewRouter creates and configures the Chi router with all routes and middleware.
func NewRouter(deps RouterDeps) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CORS(deps.AllowedOrigins))

	// Health check (no auth required)
	healthHandler := handlers.NewHealthHandler()
	r.Get("/health", healthHandler.Health)

	// API routes
	r.Route("/api", func(r chi.Router) {
		stockHandler := handlers.NewStockHandler(deps.StockService)
		searchHandler := handlers.NewSearchHandler(deps.SearchIndex)

		r.Get("/stock/{ticker}", stockHandler.GetStock)
		r.Get("/search", searchHandler.Search)
	})

	return r
}
