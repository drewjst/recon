package massive

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

const baseURL = "https://api.polygon.io"

const maxConcurrent = 5

// Client is a Polygon (Massive) API client for price and technical indicator data.
type Client struct {
	apiKey          string
	httpClient      *http.Client
	sem             chan struct{} // concurrency semaphore
	baseURLOverride string       // for testing; empty uses default baseURL
}

// NewClient creates a new Massive API client with the given API key.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		sem: make(chan struct{}, maxConcurrent),
	}
}

// get performs an authenticated GET request and decodes the JSON response into dest.
// Returns nil, nil for 404 (not found). Returns descriptive errors for auth failures
// and rate limiting.
func (c *Client) get(ctx context.Context, url string, dest interface{}) error {
	// Acquire semaphore slot
	select {
	case c.sem <- struct{}{}:
		defer func() { <-c.sem }()
	case <-ctx.Done():
		return ctx.Err()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading response body: %w", err)
	}

	switch resp.StatusCode {
	case http.StatusOK:
		// success — decode below
	case http.StatusNotFound:
		return errNotFound
	case http.StatusTooManyRequests:
		slog.Warn("polygon rate limit hit", "url", url)
		return fmt.Errorf("polygon rate limit exceeded (429): %w", errRateLimited)
	case http.StatusUnauthorized, http.StatusForbidden:
		msg := parseErrorMessage(body)
		return fmt.Errorf("polygon auth error (%d): %s", resp.StatusCode, msg)
	default:
		msg := parseErrorMessage(body)
		return fmt.Errorf("polygon API error (%d): %s", resp.StatusCode, msg)
	}

	if err := json.Unmarshal(body, dest); err != nil {
		return fmt.Errorf("decoding response: %w", err)
	}

	return nil
}

// buildURL constructs a full URL from the base and path.
func (c *Client) buildURL(path string) string {
	base := baseURL
	if c.baseURLOverride != "" {
		base = c.baseURLOverride
	}
	return fmt.Sprintf("%s%s", base, path)
}

// appendKey adds the apiKey query parameter to a URL.
// If the URL already has query params, appends with &; otherwise with ?.
func (c *Client) appendKey(rawURL string) string {
	for i := range rawURL {
		if rawURL[i] == '?' {
			return rawURL + "&apiKey=" + c.apiKey
		}
	}
	return rawURL + "?apiKey=" + c.apiKey
}

// parseErrorMessage attempts to extract an error message from a Polygon error response body.
func parseErrorMessage(body []byte) string {
	var pe polygonError
	if err := json.Unmarshal(body, &pe); err == nil && pe.Error != "" {
		return pe.Error
	}
	if len(body) > 200 {
		return string(body[:200])
	}
	return string(body)
}

// sentinel errors
type sentinelError string

func (e sentinelError) Error() string { return string(e) }

const (
	errNotFound    sentinelError = "not found"
	errRateLimited sentinelError = "rate limited"
)

// IsNotFound reports whether the error indicates the resource was not found.
func IsNotFound(err error) bool {
	return err == errNotFound
}

// IsRateLimited reports whether the error indicates a rate limit was hit.
func IsRateLimited(err error) bool {
	return err == errRateLimited
}
