package massive

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewClient(t *testing.T) {
	c := NewClient("test-key")
	if c == nil {
		t.Fatal("expected non-nil client")
	}
	if c.apiKey != "test-key" {
		t.Errorf("expected apiKey %q, got %q", "test-key", c.apiKey)
	}
	if c.httpClient.Timeout != 10*time.Second {
		t.Errorf("expected 10s timeout, got %v", c.httpClient.Timeout)
	}
	if cap(c.sem) != maxConcurrent {
		t.Errorf("expected semaphore capacity %d, got %d", maxConcurrent, cap(c.sem))
	}
}

func TestBuildURL(t *testing.T) {
	c := NewClient("abc123")
	got := c.buildURL("/v2/snapshot/locale/us/markets/stocks/tickers/AAPL")
	want := "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/AAPL"
	if got != want {
		t.Errorf("buildURL:\n  got  %q\n  want %q", got, want)
	}
}

func TestAppendKey(t *testing.T) {
	c := NewClient("mykey")

	tests := []struct {
		name string
		url  string
		want string
	}{
		{
			name: "no existing params",
			url:  "https://api.polygon.io/v2/snapshot",
			want: "https://api.polygon.io/v2/snapshot?apiKey=mykey",
		},
		{
			name: "with existing params",
			url:  "https://api.polygon.io/v2/aggs?adjusted=true",
			want: "https://api.polygon.io/v2/aggs?adjusted=true&apiKey=mykey",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := c.appendKey(tt.url)
			if got != tt.want {
				t.Errorf("appendKey(%q):\n  got  %q\n  want %q", tt.url, got, tt.want)
			}
		})
	}
}

func TestSplitBatches(t *testing.T) {
	tests := []struct {
		name     string
		items    []string
		size     int
		wantLen  int
		wantLast int // length of last batch
	}{
		{"exact", []string{"A", "B", "C", "D"}, 2, 2, 2},
		{"remainder", []string{"A", "B", "C"}, 2, 2, 1},
		{"single batch", []string{"A"}, 50, 1, 1},
		{"empty", []string{}, 50, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			batches := splitBatches(tt.items, tt.size)
			if len(batches) != tt.wantLen {
				t.Errorf("got %d batches, want %d", len(batches), tt.wantLen)
			}
			if tt.wantLen > 0 && len(batches[len(batches)-1]) != tt.wantLast {
				t.Errorf("last batch len = %d, want %d", len(batches[len(batches)-1]), tt.wantLast)
			}
		})
	}
}

func TestGetSnapshot_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := singleSnapshotResponse{
			Status: "OK",
			Ticker: snapshotTicker{
				Ticker:              "AAPL",
				TodaysChange:        1.5,
				TodaysChangePercent: 0.85,
				Updated:             1700000000000000000,
				Day:                 snapshotOHLC{O: 150.0, H: 152.0, L: 149.0, C: 151.0, V: 1000000, VW: 150.5},
				PrevDay:             snapshotOHLC{O: 148.0, H: 150.0, L: 147.0, C: 149.5, V: 900000, VW: 148.5},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	snap, err := c.GetSnapshot(context.Background(), "AAPL")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if snap == nil {
		t.Fatal("expected non-nil snapshot")
	}
	if snap.Ticker != "AAPL" {
		t.Errorf("expected ticker AAPL, got %s", snap.Ticker)
	}
	if snap.Day.Open != 150.0 {
		t.Errorf("expected day open 150.0, got %f", snap.Day.Open)
	}
	if snap.TodaysChangePercent != 0.85 {
		t.Errorf("expected change percent 0.85, got %f", snap.TodaysChangePercent)
	}
}

func TestGetSnapshot_NotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(polygonError{Status: "ERROR", Error: "not found"})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	snap, err := c.GetSnapshot(context.Background(), "INVALID")
	if err != nil {
		t.Fatalf("expected nil error for 404, got: %v", err)
	}
	if snap != nil {
		t.Error("expected nil snapshot for 404")
	}
}

func TestGetDailyBars_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := barsResponse{
			Status:       "OK",
			ResultsCount: 2,
			Results: []barWire{
				{O: 100, H: 105, L: 99, C: 104, V: 500000, VW: 102, T: 1700000000000, N: 10000},
				{O: 104, H: 107, L: 103, C: 106, V: 600000, VW: 105, T: 1700086400000, N: 12000},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	from := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2024, 1, 31, 0, 0, 0, 0, time.UTC)

	bars, err := c.GetDailyBars(context.Background(), "AAPL", from, to)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(bars) != 2 {
		t.Fatalf("expected 2 bars, got %d", len(bars))
	}
	if bars[0].Open != 100 {
		t.Errorf("expected first bar open 100, got %f", bars[0].Open)
	}
	if bars[1].NumTrades != 12000 {
		t.Errorf("expected second bar num trades 12000, got %d", bars[1].NumTrades)
	}
}

func TestGetSMA_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := indicatorResponse{
			Results: indicatorResults{
				Values: []indicatorValue{
					{Value: 152.34, Timestamp: 1700000000000},
				},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	result, err := c.GetSMA(context.Background(), "AAPL", 50)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.Value != 152.34 {
		t.Errorf("expected SMA value 152.34, got %f", result.Value)
	}
}

func TestGetRSI_EmptyValues(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := indicatorResponse{
			Results: indicatorResults{Values: []indicatorValue{}},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	result, err := c.GetRSI(context.Background(), "AAPL", 14)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Error("expected nil result for empty values")
	}
}

func TestGet_AuthError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(polygonError{Status: "ERROR", Error: "invalid api key"})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "bad-key")
	_, err := c.GetSnapshot(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected error for 403")
	}
	if !strings.Contains(err.Error(), "auth error") {
		t.Errorf("expected auth error, got: %v", err)
	}
}

func TestGet_RateLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL, "test-key")
	_, err := c.GetSnapshot(context.Background(), "AAPL")
	if err == nil {
		t.Fatal("expected error for 429")
	}
	if !IsRateLimited(err) && !strings.Contains(err.Error(), "rate limit") {
		t.Errorf("expected rate limit error, got: %v", err)
	}
}

// newTestClient creates a client that points at a test server instead of the real API.
func newTestClient(serverURL, apiKey string) *Client {
	c := NewClient(apiKey)
	c.baseURLOverride = serverURL
	return c
}
