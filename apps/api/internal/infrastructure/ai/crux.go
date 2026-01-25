package ai

import (
	"context"
	"fmt"
	"log/slog"

	"cloud.google.com/go/vertexai/genai"
)

// Default configuration values
const (
	DefaultModel       = "gemini-1.5-flash"
	DefaultLocation    = "us-central1"
	DefaultTemperature = 0.7
	DefaultMaxTokens   = 300
)

// CruxConfig holds configuration for the CruxAI client.
type CruxConfig struct {
	ProjectID   string
	Location    string
	Model       string
	Temperature float32
	MaxTokens   int32
}

// CruxClient wraps the Vertex AI genai client for generating insights.
type CruxClient struct {
	client      *genai.Client
	model       *genai.GenerativeModel
	temperature float32
	maxTokens   int32
}

// NewCruxClient creates a new CruxAI client with the given configuration.
func NewCruxClient(ctx context.Context, cfg CruxConfig) (*CruxClient, error) {
	if cfg.ProjectID == "" {
		return nil, fmt.Errorf("GCP project ID is required")
	}

	// Apply defaults
	if cfg.Location == "" {
		cfg.Location = DefaultLocation
	}
	if cfg.Model == "" {
		cfg.Model = DefaultModel
	}
	if cfg.Temperature == 0 {
		cfg.Temperature = DefaultTemperature
	}
	if cfg.MaxTokens == 0 {
		cfg.MaxTokens = DefaultMaxTokens
	}

	client, err := genai.NewClient(ctx, cfg.ProjectID, cfg.Location)
	if err != nil {
		return nil, fmt.Errorf("creating vertex AI client: %w", err)
	}

	model := client.GenerativeModel(cfg.Model)
	model.SetTemperature(cfg.Temperature)
	model.SetMaxOutputTokens(cfg.MaxTokens)

	slog.Info("CruxAI client initialized",
		"project", cfg.ProjectID,
		"location", cfg.Location,
		"model", cfg.Model,
		"temperature", cfg.Temperature,
		"maxTokens", cfg.MaxTokens,
	)

	return &CruxClient{
		client:      client,
		model:       model,
		temperature: cfg.Temperature,
		maxTokens:   cfg.MaxTokens,
	}, nil
}

// GenerateInsight sends a prompt to the model and returns the text response.
func (c *CruxClient) GenerateInsight(ctx context.Context, prompt string) (string, error) {
	if prompt == "" {
		return "", fmt.Errorf("prompt cannot be empty")
	}

	resp, err := c.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("generating content: %w", err)
	}

	text := extractText(resp)
	if text == "" {
		return "", fmt.Errorf("no text content in response")
	}

	return text, nil
}

// Close releases resources held by the client.
func (c *CruxClient) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

// extractText extracts the text content from a Vertex AI response.
func extractText(resp *genai.GenerateContentResponse) string {
	if resp == nil || len(resp.Candidates) == 0 {
		return ""
	}

	candidate := resp.Candidates[0]
	if candidate.Content == nil || len(candidate.Content.Parts) == 0 {
		return ""
	}

	var result string
	for _, part := range candidate.Content.Parts {
		if text, ok := part.(genai.Text); ok {
			result += string(text)
		}
	}

	return result
}
