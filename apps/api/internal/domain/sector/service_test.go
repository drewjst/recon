package sector

import (
	"testing"
	"time"

	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/massive"
)

func TestIsValidSector(t *testing.T) {
	tests := []struct {
		sector string
		want   bool
	}{
		{"Technology", true},
		{"Healthcare", true},
		{"Financial Services", true},
		{"Consumer Cyclical", true},
		{"Communication Services", true},
		{"Industrials", true},
		{"Consumer Defensive", true},
		{"Energy", true},
		{"Basic Materials", true},
		{"Real Estate", true},
		{"Utilities", true},
		{"technology", false},
		{"Tech", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.sector, func(t *testing.T) {
			if got := IsValidSector(tt.sector); got != tt.want {
				t.Errorf("IsValidSector(%q) = %v, want %v", tt.sector, got, tt.want)
			}
		})
	}
}

func TestNormalizeSectorParam(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"Technology", "Technology"},
		{"Financial-Services", "Financial Services"},
		{"Consumer-Cyclical", "Consumer Cyclical"},
		{"Basic-Materials", "Basic Materials"},
		{"Real-Estate", "Real Estate"},
		{"Communication-Services", "Communication Services"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			if got := NormalizeSectorParam(tt.input); got != tt.want {
				t.Errorf("NormalizeSectorParam(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestSampleSparkline(t *testing.T) {
	// 10 bars, sample to 5 points
	bars := make([]massive.Bar, 10)
	for i := range bars {
		bars[i].Close = float64(i + 1) * 10
	}

	sparkline := sampleSparkline(bars, 5)
	if len(sparkline) != 5 {
		t.Fatalf("expected 5 points, got %d", len(sparkline))
	}

	// First point should be bar[0].Close = 10
	if sparkline[0] != 10 {
		t.Errorf("expected first point 10, got %f", sparkline[0])
	}
}

func TestSampleSparkline_FewerBarsThanPoints(t *testing.T) {
	bars := []massive.Bar{
		{Close: 10},
		{Close: 20},
		{Close: 30},
	}

	sparkline := sampleSparkline(bars, 50)
	if len(sparkline) != 3 {
		t.Fatalf("expected 3 points, got %d", len(sparkline))
	}
}

func TestCalculateReturns(t *testing.T) {
	now := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)

	bars := []massive.Bar{
		{Close: 100, Timestamp: time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC).UnixMilli()},
		{Close: 105, Timestamp: time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC).UnixMilli()},
		{Close: 110, Timestamp: time.Date(2026, 5, 16, 0, 0, 0, 0, time.UTC).UnixMilli()},
		{Close: 120, Timestamp: time.Date(2026, 6, 14, 0, 0, 0, 0, time.UTC).UnixMilli()},
	}

	ytd, oneMonth, oneYear := calculateReturns(bars, now)

	// 1Y return: (120-100)/100 = 20%
	if oneYear == nil {
		t.Fatal("expected non-nil 1Y return")
	}
	if *oneYear != 20.0 {
		t.Errorf("1Y return = %f, want 20.0", *oneYear)
	}

	// YTD: (120-105)/105 ≈ 14.29%
	if ytd == nil {
		t.Fatal("expected non-nil YTD return")
	}
	if *ytd < 14 || *ytd > 15 {
		t.Errorf("YTD return = %f, want ~14.29", *ytd)
	}

	// 1M: (120-110)/110 ≈ 9.09%
	if oneMonth == nil {
		t.Fatal("expected non-nil 1M return")
	}
	if *oneMonth < 9 || *oneMonth > 10 {
		t.Errorf("1M return = %f, want ~9.09", *oneMonth)
	}
}

func TestCalculateHighLow(t *testing.T) {
	bars := []massive.Bar{
		{High: 150, Low: 140},
		{High: 160, Low: 130},
		{High: 155, Low: 135},
	}

	high, low := calculateHighLow(bars)
	if high == nil || *high != 160 {
		t.Errorf("high = %v, want 160", high)
	}
	if low == nil || *low != 130 {
		t.Errorf("low = %v, want 130", low)
	}
}

func TestCalculateRSRank(t *testing.T) {
	entries := []StockEntry{
		{Ticker: "A", OneYearChange: float64Ptr(-20)},
		{Ticker: "B", OneYearChange: float64Ptr(10)},
		{Ticker: "C", OneYearChange: float64Ptr(50)},
		{Ticker: "D", OneYearChange: nil}, // no data
		{Ticker: "E", OneYearChange: float64Ptr(-5)},
	}

	calculateRSRank(entries)

	// Ranked ascending: A(-20), E(-5), B(10), C(50)
	// A should have lowest rank, C highest
	if entries[0].RSRank == nil {
		t.Fatal("A should have a rank")
	}
	if entries[2].RSRank == nil {
		t.Fatal("C should have a rank")
	}
	if *entries[0].RSRank >= *entries[2].RSRank {
		t.Errorf("A rank (%d) should be less than C rank (%d)", *entries[0].RSRank, *entries[2].RSRank)
	}
	if entries[3].RSRank != nil {
		t.Error("D (nil 1Y change) should not have a rank")
	}
}

func TestCalculateSummary(t *testing.T) {
	entries := []StockEntry{
		{Ps: float64Ptr(5.0), Pe: float64Ptr(20.0), YtdChange: float64Ptr(-10), OneYearChange: float64Ptr(-20)},
		{Ps: float64Ptr(10.0), Pe: float64Ptr(30.0), YtdChange: float64Ptr(-5), OneYearChange: float64Ptr(10)},
		{Ps: float64Ptr(15.0), Pe: nil, YtdChange: float64Ptr(5), OneYearChange: float64Ptr(30)},
	}

	summary := calculateSummary(entries)

	// Avg P/S: (5+10+15)/3 = 10.0
	if summary.AvgPs == nil || *summary.AvgPs != 10.0 {
		t.Errorf("AvgPs = %v, want 10.0", summary.AvgPs)
	}

	// Avg P/E: (20+30)/2 = 25.0 (nil excluded)
	if summary.AvgPe == nil || *summary.AvgPe != 25.0 {
		t.Errorf("AvgPe = %v, want 25.0", summary.AvgPe)
	}

	// Median YTD: sorted [-10, -5, 5] → median = -5
	if summary.MedianYtd == nil || *summary.MedianYtd != -5.0 {
		t.Errorf("MedianYtd = %v, want -5.0", summary.MedianYtd)
	}

	// Median 1Y: sorted [-20, 10, 30] → median = 10
	if summary.Median1y == nil || *summary.Median1y != 10.0 {
		t.Errorf("Median1y = %v, want 10.0", summary.Median1y)
	}
}

func TestSortStocks(t *testing.T) {
	entries := []StockEntry{
		{Ticker: "A", MarketCap: 100, From52wHigh: float64Ptr(-50)},
		{Ticker: "B", MarketCap: 300, From52wHigh: float64Ptr(-10)},
		{Ticker: "C", MarketCap: 200, From52wHigh: float64Ptr(-30)},
	}

	sortStocks(entries, "52whigh")
	if entries[0].Ticker != "B" {
		t.Errorf("52whigh sort: first should be B (closest to high), got %s", entries[0].Ticker)
	}

	sortStocks(entries, "marketcap")
	if entries[0].Ticker != "B" {
		t.Errorf("marketcap sort: first should be B (largest), got %s", entries[0].Ticker)
	}
}

func TestValidSortFields(t *testing.T) {
	expected := []string{"52whigh", "ytd", "1y", "marketcap", "ps", "pe"}
	for _, f := range expected {
		if !ValidSortFields[f] {
			t.Errorf("expected %q to be a valid sort field", f)
		}
	}
	if ValidSortFields["invalid"] {
		t.Error("'invalid' should not be a valid sort field")
	}
}
