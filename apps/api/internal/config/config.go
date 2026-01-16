package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	FMPAPIKey      string
	AllowedOrigins []string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:      getEnv("PORT", "8080"),
		Env:       getEnv("ENV", "development"),
		FMPAPIKey: os.Getenv("FMP_API_KEY"),
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		cfg.AllowedOrigins = []string{"http://localhost:3000"}
	} else {
		rawOrigins := strings.Split(allowedOrigins, ",")
		for _, origin := range rawOrigins {
			if trimmed := strings.TrimSpace(origin); trimmed != "" {
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, trimmed)
			}
		}
	}

	if cfg.FMPAPIKey == "" {
		return nil, fmt.Errorf("FMP_API_KEY environment variable is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
