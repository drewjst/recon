// Package api provides HTTP routing and request handling.
package api

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/drewjst/crux/apps/api/internal/api/handlers"
	"github.com/drewjst/crux/apps/api/internal/api/middleware"
	"github.com/drewjst/crux/apps/api/internal/application/services"
	"github.com/drewjst/crux/apps/api/internal/domain/search"
	"github.com/drewjst/crux/apps/api/internal/domain/stock"
	"github.com/drewjst/crux/apps/api/internal/domain/valuation"
)

// RouterDeps contains all dependencies needed by the router.
type RouterDeps struct {
	StockService     *stock.Service
	ValuationService *valuation.Service
	InsightService   *services.InsightService
	PolygonSearcher  *search.PolygonSearcher
	AllowedOrigins   []string
}

// NewRouter creates and configures the Chi router with all routes and middleware.
func NewRouter(deps RouterDeps) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(chimiddleware.Compress(5)) // Compress responses
	r.Use(middleware.CORS(deps.AllowedOrigins))
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RateLimit(10)) // 10 requests per second per IP

	// Health check (no auth required)
	healthHandler := handlers.NewHealthHandler()
	r.Get("/health", healthHandler.Health)

	// API routes
	r.Route("/api", func(r chi.Router) {
		stockHandler := handlers.NewStockHandler(deps.StockService)
		searchHandler := handlers.NewSearchHandler(deps.PolygonSearcher)
		valuationHandler := handlers.NewValuationHandler(deps.ValuationService)

		r.Get("/stock/{ticker}", stockHandler.GetStock)
		r.Get("/stock/{ticker}/valuation", valuationHandler.GetValuation)
		r.Get("/search", searchHandler.Search)

		// CruxAI insight routes (v1)
		if deps.InsightService != nil {
			insightHandler := handlers.NewInsightHandler(deps.InsightService)
			r.Route("/v1/insights", func(r chi.Router) {
				r.Get("/{section}", insightHandler.GetInsight)
			})
			slog.Info("CruxAI insight routes registered", "path", "/api/v1/insights/{section}")
		} else {
			slog.Info("CruxAI insight routes not registered (service disabled)")
		}
	})

	return r
}
