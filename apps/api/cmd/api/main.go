// Package main is the entry point for the Crux API server.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/datatypes"

	"github.com/drewjst/crux/apps/api/internal/api"
	"github.com/drewjst/crux/apps/api/internal/application/services"
	"github.com/drewjst/crux/apps/api/internal/config"
	"github.com/drewjst/crux/apps/api/internal/domain/institutional"
	"github.com/drewjst/crux/apps/api/internal/domain/search"
	"github.com/drewjst/crux/apps/api/internal/domain/stock"
	"github.com/drewjst/crux/apps/api/internal/domain/valuation"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/ai"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/db"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/external/polygon"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
)

func main() {
	// Load .env file in development
	_ = godotenv.Load()

	// Initialize structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	if err := run(); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	// Initialize database if configured
	var cacheRepo *db.Repository
	if cfg.DatabaseURL != "" {
		gormDB, err := db.NewConnection(cfg.DatabaseURL)
		if err != nil {
			return err
		}
		slog.Info("database connected")

		// Auto-migrate cache tables
		if err := db.AutoMigrate(gormDB); err != nil {
			return err
		}
		slog.Info("database migrations complete")

		cacheRepo = db.NewRepository(gormDB)
	} else {
		slog.Info("DATABASE_URL not set, running without cache database")
	}

	// Create provider based on config
	providerCfg := providers.Config{
		FMPAPIKey: cfg.FMPAPIKey,
	}
	rawProvider, err := providers.NewFullProvider(providerCfg)
	if err != nil {
		return err
	}

	// Wrap provider with caching layer if database is available
	var fundamentalsProvider providers.FundamentalsProvider = rawProvider
	if cacheRepo != nil {
		fundamentalsProvider = providers.NewCachedFundamentalsProvider(
			rawProvider,
			cacheRepo,
			"fmp",
		)
		slog.Info("provider caching enabled")
	}

	// Initialize Polygon client (used for search and short interest)
	polygonClient := polygon.NewClient(cfg.PolygonAPIKey)
	polygonSearcher := search.NewPolygonSearcher(polygonClient)
	slog.Info("polygon search initialized")

	// Initialize stock service with cached provider and Polygon client
	stockService := stock.NewCachedService(
		fundamentalsProvider,
		rawProvider, // QuoteProvider (not cached at provider level)
		cacheRepo,
		stock.DefaultServiceConfig(),
		polygonClient,
	)
	slog.Info("stock service initialized", "provider", "fmp", "caching", cacheRepo != nil)

	// Initialize valuation service with cached provider
	valuationService := valuation.NewService(fundamentalsProvider, rawProvider)
	slog.Info("valuation service initialized", "caching", cacheRepo != nil)

	// Initialize institutional service with FMP client
	var institutionalService *institutional.Service
	if cfg.FMPAPIKey != "" {
		fmpClient := fmp.NewClient(fmp.Config{APIKey: cfg.FMPAPIKey})
		institutionalService = institutional.NewService(fmpClient)
		slog.Info("institutional service initialized")
	} else {
		slog.Info("institutional service disabled (no FMP API key)")
	}

	// Initialize CruxAI client and insight service
	var insightService *services.InsightService
	if cfg.CruxAI.Enabled {
		cruxClient, err := ai.NewCruxClient(context.Background(), ai.CruxConfig{
			ProjectID:   cfg.CruxAI.ProjectID,
			Location:    cfg.CruxAI.Location,
			Model:       cfg.CruxAI.Model,
			Temperature: cfg.CruxAI.Temperature,
			MaxTokens:   cfg.CruxAI.MaxTokens,
		})
		if err != nil {
			slog.Warn("failed to initialize CruxAI client, insights disabled", "error", err)
		} else {
			// Create insight cache adapter if database is available
			var insightCache services.InsightCache
			if cacheRepo != nil {
				insightCache = services.NewInsightCacheAdapter(
					func(dataType, key string) ([]byte, error) {
						cache, err := cacheRepo.GetProviderCache(dataType, key)
						if err != nil || cache == nil {
							return nil, err
						}
						return cache.Data, nil
					},
					func(dataType, key string, data []byte, expiresAt time.Time) error {
						return cacheRepo.SetProviderCache(&db.ProviderCache{
							DataType:  dataType,
							Key:       key,
							Data:      datatypes.JSON(data),
							Provider:  "cruxai",
							ExpiresAt: expiresAt,
						})
					},
				)
			}

			insightService = services.NewInsightService(
				cruxClient,
				fundamentalsProvider,
				rawProvider,
				insightCache,
				true,
			)
			slog.Info("CruxAI insight service initialized",
				"model", cfg.CruxAI.Model,
				"caching", cacheRepo != nil,
			)
		}
	} else {
		slog.Info("CruxAI insights disabled")
	}

	// Initialize router
	router := api.NewRouter(api.RouterDeps{
		StockService:         stockService,
		ValuationService:     valuationService,
		InstitutionalService: institutionalService,
		InsightService:       insightService,
		PolygonSearcher:      polygonSearcher,
		AllowedOrigins:       cfg.AllowedOrigins,
	})

	// Create server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		slog.Info("starting server", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
		}
	}()

	// Wait for shutdown signal
	return gracefulShutdown(srv)
}

func gracefulShutdown(srv *http.Server) error {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		return err
	}

	slog.Info("server stopped")
	return nil
}
