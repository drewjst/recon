// Package main is the entry point for the Recon API server.
package main

import (
	"context"
	"fmt"
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
	"github.com/drewjst/recon/apps/api/internal/infrastructure/external/fmp"
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

	// Initialize FMP client
	fmpClient := fmp.NewClient(fmp.Config{
		APIKey: cfg.FMPAPIKey,
	})

	// Initialize FMP repository (implements stock.Repository)
	repo := fmp.NewRepository(fmpClient)

	// Initialize stock service (no cache for MVP)
	stockService := stock.NewService(repo, nil)

	// Initialize search index with embedded ticker data
	searchIndex, err := search.NewIndex()
	if err != nil {
		return fmt.Errorf("initializing search index: %w", err)
	}
	slog.Info("search index initialized")

	// Initialize router
	router := api.NewRouter(api.RouterDeps{
		StockService:   stockService,
		SearchIndex:    searchIndex,
		AllowedOrigins: cfg.AllowedOrigins,
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
