package providers

import (
	"fmt"
	"strings"

	"github.com/drewjst/recon/apps/api/internal/infrastructure/providers/eodhd"
	"github.com/drewjst/recon/apps/api/internal/infrastructure/providers/fmp"
)

// ProviderType represents the type of data provider to use.
type ProviderType string

const (
	ProviderTypeFMP   ProviderType = "fmp"
	ProviderTypeEODHD ProviderType = "eodhd"
)

// Config holds provider factory configuration.
type Config struct {
	// Provider specifies which provider to use ("fmp" or "eodhd")
	Provider    ProviderType
	FMPAPIKey   string
	EODHDAPIKey string
}

// FullProvider combines all provider interfaces.
type FullProvider interface {
	FundamentalsProvider
	QuoteProvider
	SearchProvider
}

// NewFullProvider creates a provider that implements all interfaces.
func NewFullProvider(cfg Config) (FullProvider, error) {
	switch cfg.Provider {
	case ProviderTypeFMP:
		if cfg.FMPAPIKey == "" {
			return nil, fmt.Errorf("FMP_API_KEY is required when using FMP provider")
		}
		return fmp.NewProvider(cfg.FMPAPIKey), nil
	case ProviderTypeEODHD, "":
		if cfg.EODHDAPIKey == "" {
			return nil, fmt.Errorf("EODHD_API_KEY is required when using EODHD provider")
		}
		return eodhd.NewProvider(cfg.EODHDAPIKey), nil
	default:
		return nil, fmt.Errorf("unknown provider type: %s", cfg.Provider)
	}
}

// ParseProviderType converts a string to ProviderType.
// Defaults to EODHD if empty or unrecognized.
func ParseProviderType(s string) ProviderType {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "fmp":
		return ProviderTypeFMP
	case "eodhd", "":
		return ProviderTypeEODHD
	default:
		return ProviderTypeEODHD
	}
}
