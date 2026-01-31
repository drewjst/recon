package providers

import (
	"fmt"

	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
)

// Config holds provider factory configuration.
type Config struct {
	FMPAPIKey string
}

// FullProvider combines all provider interfaces.
type FullProvider interface {
	FundamentalsProvider
	QuoteProvider
	SearchProvider
}

// NewFullProvider creates a provider that implements all interfaces.
func NewFullProvider(cfg Config) (FullProvider, error) {
	if cfg.FMPAPIKey == "" {
		return nil, fmt.Errorf("FMP_API_KEY is required")
	}
	return fmp.NewProvider(cfg.FMPAPIKey), nil
}
