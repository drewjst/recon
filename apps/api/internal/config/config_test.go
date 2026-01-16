package config

import (
	"os"
	"reflect"
	"testing"
)

func TestLoad_AllowedOrigins(t *testing.T) {
	// Save current env vars and restore after test
	originalAPIKey := os.Getenv("FMP_API_KEY")
	originalOrigins := os.Getenv("ALLOWED_ORIGINS")
	defer func() {
		os.Setenv("FMP_API_KEY", originalAPIKey)
		os.Setenv("ALLOWED_ORIGINS", originalOrigins)
	}()

	// Ensure API key is set so Load() doesn't fail
	os.Setenv("FMP_API_KEY", "test-key")

	tests := []struct {
		name            string
		envOrigins      string
		expectedOrigins []string
	}{
		{
			name:            "default origins",
			envOrigins:      "",
			expectedOrigins: []string{"http://localhost:3000"},
		},
		{
			name:            "single origin",
			envOrigins:      "https://example.com",
			expectedOrigins: []string{"https://example.com"},
		},
		{
			name:            "multiple origins",
			envOrigins:      "https://example.com,https://api.example.com",
			expectedOrigins: []string{"https://example.com", "https://api.example.com"},
		},
		{
			name:            "origins with whitespace",
			envOrigins:      " https://example.com , https://api.example.com ",
			expectedOrigins: []string{"https://example.com", "https://api.example.com"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("ALLOWED_ORIGINS", tt.envOrigins)

			cfg, err := Load()
			if err != nil {
				t.Fatalf("Load() error = %v", err)
			}

			if !reflect.DeepEqual(cfg.AllowedOrigins, tt.expectedOrigins) {
				t.Errorf("Load() allowed origins = %v, want %v", cfg.AllowedOrigins, tt.expectedOrigins)
			}
		})
	}
}
