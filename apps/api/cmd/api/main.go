// Package main is the entry point for the Recon API server.
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

	"github.com/drewjst/recon/apps/api/internal/api"
	"github.com/drewjst/recon/apps/api/internal/config"
	"github.com/drewjst/recon/apps/api/internal/domain/search"
	"github.com/drewjst/recon/apps/api/internal/domain/stock"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/db"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/external/fmp"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/external/polygon"
	fmpprovider "github.com/drewjst/recon/apps/api/internal/infrastructure/providers/fmp"
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

	// Initialize FMP client (legacy)
	fmpClient := fmp.NewClient(fmp.Config{
		APIKey: cfg.FMPAPIKey,
	})

	// Initialize stock service
	var stockService *stock.Service
	if cacheRepo != nil {
		// Use new provider-based service with caching
		fmpProvider := fmpprovider.NewProvider(cfg.FMPAPIKey)
		stockService = stock.NewCachedService(
			fmpProvider,
			fmpProvider,
			cacheRepo,
			stock.DefaultServiceConfig(),
		)
		slog.Info("stock service initialized with caching")
	} else {
		// Use legacy FMP repository
		repo := fmp.NewRepository(fmpClient)
		stockService = stock.NewService(repo, nil)
		slog.Info("stock service initialized without caching")
	}

	// Initialize Polygon client and search service
	polygonClient := polygon.NewClient(cfg.PolygonAPIKey)
	polygonSearcher := search.NewPolygonSearcher(polygonClient)
	slog.Info("polygon search initialized")

	// Initialize router
	router := api.NewRouter(api.RouterDeps{
		StockService:    stockService,
		PolygonSearcher: polygonSearcher,
		AllowedOrigins:  cfg.AllowedOrigins,
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
