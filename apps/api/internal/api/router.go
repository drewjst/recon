// Package api provides HTTP routing and request handling.
package api

import (
	"log/slog"

	"github.com/go-chi/chi/v5"

	"github.com/drewjst/crux/apps/api/internal/api/handlers"
	"github.com/drewjst/crux/apps/api/internal/api/middleware"
	"github.com/drewjst/crux/apps/api/internal/application/services"
	"github.com/drewjst/crux/apps/api/internal/domain/institutional"
	"github.com/drewjst/crux/apps/api/internal/domain/repository"
	"github.com/drewjst/crux/apps/api/internal/domain/search"
	"github.com/drewjst/crux/apps/api/internal/domain/stock"
	"github.com/drewjst/crux/apps/api/internal/domain/valuation"
)

// RouterDeps contains all dependencies needed by the router.
type RouterDeps struct {
	StockService         *stock.Service
	ValuationService     *valuation.Service
	InstitutionalService *institutional.Service
	InsightService       *services.InsightService
	FinancialsRepo       repository.FinancialsRepository
	PolygonSearcher      *search.PolygonSearcher
	AllowedOrigins       []string
	APIKeys              []string // Valid API keys (empty = auth disabled)
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
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RateLimit(10)) // 10 requests per second per IP

	// Health check (no auth required)
	healthHandler := handlers.NewHealthHandler()
	r.Get("/health", healthHandler.Health)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Apply API key authentication (disabled if no keys configured)
		r.Use(middleware.APIKeyAuth(deps.APIKeys))

		stockHandler := handlers.NewStockHandler(deps.StockService)
		searchHandler := handlers.NewSearchHandler(deps.PolygonSearcher)
		valuationHandler := handlers.NewValuationHandler(deps.ValuationService)

		r.Get("/stock/{ticker}", stockHandler.GetStock)
		r.Get("/stock/{ticker}/valuation", valuationHandler.GetValuation)
		r.Get("/search", searchHandler.Search)

		// Institutional ownership deep dive
		if deps.InstitutionalService != nil {
			institutionalHandler := handlers.NewInstitutionalHandler(deps.InstitutionalService)
			r.Get("/stock/{ticker}/institutional", institutionalHandler.GetInstitutionalDetail)
		}

		// Financial statements deep dive
		if deps.FinancialsRepo != nil {
			financialsHandler := handlers.NewFinancialsHandler(deps.FinancialsRepo)
			r.Route("/stock/{ticker}/financials", func(r chi.Router) {
				r.Get("/income", financialsHandler.GetIncomeStatements)
				r.Get("/balance-sheet", financialsHandler.GetBalanceSheets)
				r.Get("/cash-flow", financialsHandler.GetCashFlowStatements)
				r.Get("/segments", financialsHandler.GetRevenueSegments)
			})
			slog.Info("financials routes registered", "path", "/api/stock/{ticker}/financials/*")
		}

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
