package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// CruxAIConfig holds configuration for the CruxAI insight generator.
type CruxAIConfig struct {
	Enabled     bool
	ProjectID   string
	Location    string
	Model       string
	Temperature float32
	MaxTokens   int32
}

type Config struct {
	Port           string
	Env            string
	FMPAPIKey      string
	PolygonAPIKey  string
	DatabaseURL    string
	AllowedOrigins []string
	CruxAI         CruxAIConfig
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		Env:           getEnv("ENV", "development"),
		FMPAPIKey:     os.Getenv("FMP_API_KEY"),
		PolygonAPIKey: os.Getenv("POLYGON_API_KEY"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		CruxAI:        loadCruxAIConfig(),
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

	// Validate required API keys
	if cfg.FMPAPIKey == "" {
		return nil, fmt.Errorf("FMP_API_KEY environment variable is required")
	}

	if cfg.PolygonAPIKey == "" {
		return nil, fmt.Errorf("POLYGON_API_KEY environment variable is required")
	}

	// Validate CruxAI config when enabled
	if cfg.CruxAI.Enabled && cfg.CruxAI.ProjectID == "" {
		return nil, fmt.Errorf("GCP_PROJECT_ID environment variable is required when CRUX_AI_ENABLED=true")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadCruxAIConfig() CruxAIConfig {
	enabled := strings.ToLower(getEnv("CRUX_AI_ENABLED", "false")) == "true"

	// Parse temperature with default
	temperature := float32(0.7)
	if tempStr := os.Getenv("CRUX_AI_TEMPERATURE"); tempStr != "" {
		if parsed, err := strconv.ParseFloat(tempStr, 32); err == nil {
			temperature = float32(parsed)
		}
	}

	// Parse max tokens with default
	maxTokens := int32(300)
	if tokensStr := os.Getenv("CRUX_AI_MAX_TOKENS"); tokensStr != "" {
		if parsed, err := strconv.ParseInt(tokensStr, 10, 32); err == nil {
			maxTokens = int32(parsed)
		}
	}

	return CruxAIConfig{
		Enabled:     enabled,
		ProjectID:   os.Getenv("GCP_PROJECT_ID"),
		Location:    getEnv("GCP_LOCATION", "us-central1"),
		Model:       getEnv("CRUX_AI_MODEL", "gemini-2.0-flash-001"),
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}
}
