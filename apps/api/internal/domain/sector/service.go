// Package sector provides the sector overview service for the heatmap page.
package sector

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/drewjst/crux/apps/api/internal/infrastructure/cache"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/massive"
)

// ValidSectors lists the supported GICS sector names.
var ValidSectors = []string{
	"Technology",
	"Healthcare",
	"Financial Services",
	"Consumer Cyclical",
	"Communication Services",
	"Industrials",
	"Consumer Defensive",
	"Energy",
	"Basic Materials",
	"Real Estate",
	"Utilities",
}

// validSectorSet provides O(1) lookup for sector validation.
var validSectorSet map[string]bool

func init() {
	validSectorSet = make(map[string]bool, len(ValidSectors))
	for _, s := range ValidSectors {
		validSectorSet[s] = true
	}
}

// IsValidSector reports whether the sector name is recognized.
func IsValidSector(sector string) bool {
	return validSectorSet[sector]
}

// NormalizeSectorParam converts a URL-safe sector param (hyphens) to the
// canonical form (spaces). E.g., "Financial-Services" → "Financial Services".
func NormalizeSectorParam(param string) string {
	decoded, err := url.PathUnescape(param)
	if err != nil {
		decoded = param
	}
	return strings.ReplaceAll(decoded, "-", " ")
}

// ValidSortFields defines allowed sort query parameter values.
var ValidSortFields = map[string]bool{
	"52whigh":   true,
	"ytd":       true,
	"1y":        true,
	"marketcap": true,
	"ps":        true,
	"pe":        true,
}

const (
	defaultLimit    = 20
	minLimit        = 10
	maxLimit        = 50
	defaultSort     = "52whigh"
	maxConcurrent   = 5
	sparklinePoints = 50
)

// --- Response types ---

// SectorOverviewResponse is the top-level response for GET /api/sectors/{sector}/overview.
type SectorOverviewResponse struct {
	Sector     string          `json:"sector"`
	StockCount int             `json:"stockCount"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	Summary    OverviewSummary `json:"summary"`
	Stocks     []StockEntry    `json:"stocks"`
}

// OverviewSummary contains aggregate metrics for the sector.
type OverviewSummary struct {
	AvgPs     *float64 `json:"avgPs"`
	AvgPe     *float64 `json:"avgPe"`
	MedianYtd *float64 `json:"medianYtd"`
	Median1y  *float64 `json:"median1y"`
}

// StockEntry contains all data for one stock in the sector overview.
type StockEntry struct {
	Ticker         string    `json:"ticker"`
	Name           string    `json:"name"`
	LogoURL        string    `json:"logoUrl,omitempty"`
	Price          float64   `json:"price"`
	MarketCap      float64   `json:"marketCap"`
	Ps             *float64  `json:"ps"`
	Pe             *float64  `json:"pe"`
	YtdChange      *float64  `json:"ytdChange"`
	OneMonthChange *float64  `json:"oneMonthChange"`
	OneYearChange  *float64  `json:"oneYearChange"`
	From52wHigh    *float64  `json:"from52wHigh"`
	YearHigh       *float64  `json:"yearHigh"`
	YearLow        *float64  `json:"yearLow"`
	SMA20          *bool     `json:"sma20"`
	SMA50          *bool     `json:"sma50"`
	SMA200         *bool     `json:"sma200"`
	RSRank         *int      `json:"rsRank"`
	Sparkline      []float64 `json:"sparkline,omitempty"`
	ChartData1Y    []float64 `json:"chartData1Y,omitempty"`
}

// Service provides sector overview data by orchestrating FMP, Massive, and cache.
type Service struct {
	fmp     *fmp.Client
	massive *massive.Client
	cache   cache.TieredCache
}

// NewService creates a new sector service.
func NewService(fmpClient *fmp.Client, massiveClient *massive.Client, tieredCache cache.TieredCache) *Service {
	return &Service{
		fmp:     fmpClient,
		massive: massiveClient,
		cache:   tieredCache,
	}
}

// GetSectorOverview orchestrates the full pipeline to build a sector overview response.
func (s *Service) GetSectorOverview(ctx context.Context, sectorName string, limit int, sortField string) (*SectorOverviewResponse, error) {
	// 1. Check cache
	var cached SectorOverviewResponse
	if hit, err := s.cache.Get(ctx, "sector_overview", sectorName, &cached); err != nil {
		slog.Warn("cache get failed", "dataType", "sector_overview", "key", sectorName, "error", err)
	} else if hit {
		// Re-sort if needed (cache stores default sort)
		sortStocks(cached.Stocks, sortField)
		return &cached, nil
	}

	// 2. Get stock list from FMP screener
	screenerResults, err := s.getScreenerResults(ctx, sectorName, limit)
	if err != nil {
		return nil, fmt.Errorf("screener for %s: %w", sectorName, err)
	}
	if len(screenerResults) == 0 {
		return &SectorOverviewResponse{
			Sector:     sectorName,
			StockCount: 0,
			UpdatedAt:  time.Now().UTC(),
			Summary:    OverviewSummary{},
			Stocks:     []StockEntry{},
		}, nil
	}

	// Build initial stock entries from screener
	tickers := make([]string, len(screenerResults))
	entries := make([]StockEntry, len(screenerResults))
	for i, sr := range screenerResults {
		tickers[i] = sr.Symbol
		entries[i] = StockEntry{
			Ticker:    sr.Symbol,
			Name:      sr.Name,
			LogoURL:   sr.Image,
			Price:     sr.Price,
			MarketCap: sr.MarketCap,
		}
	}

	// 3-6: Fetch all enrichment data in parallel
	s.enrichEntries(ctx, tickers, entries)

	// 7. Calculate RS rank (in-sector percentile by 1Y return)
	calculateRSRank(entries)

	// 8. Sort by requested field
	sortStocks(entries, sortField)

	// Build summary
	summary := calculateSummary(entries)

	resp := &SectorOverviewResponse{
		Sector:     sectorName,
		StockCount: len(entries),
		UpdatedAt:  time.Now().UTC(),
		Summary:    summary,
		Stocks:     entries,
	}

	// 9. Cache the response
	if err := s.cache.Set(ctx, "sector_overview", sectorName, resp); err != nil {
		slog.Warn("cache set failed", "dataType", "sector_overview", "key", sectorName, "error", err)
	}

	return resp, nil
}

// getScreenerResults fetches screener results, using the tiered cache.
func (s *Service) getScreenerResults(ctx context.Context, sector string, limit int) ([]fmp.ScreenerResult, error) {
	cacheKey := sector
	var cached []fmp.ScreenerResult
	if hit, err := s.cache.Get(ctx, "screener", cacheKey, &cached); err != nil {
		slog.Warn("screener cache get failed", "error", err)
	} else if hit {
		if len(cached) > limit {
			cached = cached[:limit]
		}
		return cached, nil
	}

	results, err := s.fmp.GetStockScreener(ctx, sector, limit)
	if err != nil {
		return nil, err
	}

	if err := s.cache.Set(ctx, "screener", cacheKey, results); err != nil {
		slog.Warn("screener cache set failed", "error", err)
	}

	return results, nil
}

// enrichEntries fetches snapshots, technicals, ratios, and bars in parallel
// and merges them into the entries slice. Individual failures are non-fatal.
func (s *Service) enrichEntries(ctx context.Context, tickers []string, entries []StockEntry) {
	tickerIndex := make(map[string]int, len(tickers))
	for i, t := range tickers {
		tickerIndex[t] = i
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// 3. Batch snapshots (single call for all tickers)
	wg.Add(1)
	go func() {
		defer wg.Done()
		snapshots, err := s.massive.GetBatchSnapshots(ctx, tickers)
		if err != nil {
			slog.Warn("batch snapshots failed, using screener prices", "error", err)
			return
		}
		mu.Lock()
		defer mu.Unlock()
		for ticker, snap := range snapshots {
			idx, ok := tickerIndex[ticker]
			if !ok {
				continue
			}
			price := snap.Day.Close
			if price == 0 {
				price = snap.Min.Close
			}
			if price > 0 {
				entries[idx].Price = price
			}
		}
	}()

	// 4. Technicals (parallel per ticker, bounded concurrency)
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.fetchTechnicals(ctx, tickers, entries, tickerIndex, &mu)
	}()

	// 5. Ratios TTM (parallel per ticker, bounded concurrency)
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.fetchRatios(ctx, tickers, entries, tickerIndex, &mu)
	}()

	// 6. Historical bars for sparklines and return calculations
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.fetchHistorical(ctx, tickers, entries, tickerIndex, &mu)
	}()

	wg.Wait()
}

// fetchTechnicals fetches SMA/RSI for each ticker with bounded concurrency.
func (s *Service) fetchTechnicals(ctx context.Context, tickers []string, entries []StockEntry, tickerIndex map[string]int, mu *sync.Mutex) {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(maxConcurrent)

	for _, ticker := range tickers {
		g.Go(func() error {
			ti, err := s.getCachedTechnicals(gCtx, ticker, entries[tickerIndex[ticker]].Price)
			if err != nil {
				slog.Debug("technicals failed", "ticker", ticker, "error", err)
				return nil // non-fatal
			}
			if ti == nil {
				return nil
			}

			mu.Lock()
			idx := tickerIndex[ticker]
			entries[idx].SMA20 = boolPtr(ti.Above20)
			entries[idx].SMA50 = boolPtr(ti.Above50)
			entries[idx].SMA200 = boolPtr(ti.Above200)
			mu.Unlock()
			return nil
		})
	}
	_ = g.Wait()
}

// getCachedTechnicals checks individual SMA/RSI caches before calling Massive.
func (s *Service) getCachedTechnicals(ctx context.Context, ticker string, price float64) (*massive.TechnicalIndicators, error) {
	// Check if we have all cached
	var sma20, sma50, sma200 massive.IndicatorResult
	var rsi14 massive.IndicatorResult
	allCached := true

	for _, item := range []struct {
		dataType string
		dest     *massive.IndicatorResult
	}{
		{"sma_20", &sma20},
		{"sma_50", &sma50},
		{"sma_200", &sma200},
		{"rsi_14", &rsi14},
	} {
		hit, err := s.cache.Get(ctx, item.dataType, ticker, item.dest)
		if err != nil {
			slog.Debug("indicator cache error", "dataType", item.dataType, "ticker", ticker, "error", err)
			allCached = false
			break
		}
		if !hit {
			allCached = false
			break
		}
	}

	if allCached {
		return &massive.TechnicalIndicators{
			SMA20:    sma20.Value,
			SMA50:    sma50.Value,
			SMA200:   sma200.Value,
			RSI14:    rsi14.Value,
			Above20:  price > sma20.Value && sma20.Value > 0,
			Above50:  price > sma50.Value && sma50.Value > 0,
			Above200: price > sma200.Value && sma200.Value > 0,
		}, nil
	}

	// Cache miss — fetch from Massive
	ti, err := s.massive.GetTechnicals(ctx, ticker, price)
	if err != nil {
		return nil, err
	}
	if ti == nil {
		return nil, nil
	}

	// Cache individual results
	s.cacheIndicator(ctx, "sma_20", ticker, ti.SMA20)
	s.cacheIndicator(ctx, "sma_50", ticker, ti.SMA50)
	s.cacheIndicator(ctx, "sma_200", ticker, ti.SMA200)
	s.cacheIndicator(ctx, "rsi_14", ticker, ti.RSI14)

	return ti, nil
}

func (s *Service) cacheIndicator(ctx context.Context, dataType, ticker string, value float64) {
	ir := massive.IndicatorResult{Value: value, Timestamp: time.Now().UnixMilli()}
	if err := s.cache.Set(ctx, dataType, ticker, &ir); err != nil {
		slog.Debug("failed to cache indicator", "dataType", dataType, "ticker", ticker, "error", err)
	}
}

// fetchRatios fetches P/S and P/E ratios from FMP with bounded concurrency.
func (s *Service) fetchRatios(ctx context.Context, tickers []string, entries []StockEntry, tickerIndex map[string]int, mu *sync.Mutex) {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(maxConcurrent)

	for _, ticker := range tickers {
		g.Go(func() error {
			ps, pe := s.getCachedRatios(gCtx, ticker)
			mu.Lock()
			idx := tickerIndex[ticker]
			entries[idx].Ps = ps
			entries[idx].Pe = pe
			mu.Unlock()
			return nil
		})
	}
	_ = g.Wait()
}

// getCachedRatios retrieves P/S and P/E from cache or FMP.
func (s *Service) getCachedRatios(ctx context.Context, ticker string) (*float64, *float64) {
	type cachedRatios struct {
		Ps *float64 `json:"ps"`
		Pe *float64 `json:"pe"`
	}

	var cr cachedRatios
	if hit, err := s.cache.Get(ctx, "ratios_ttm", ticker, &cr); err == nil && hit {
		return cr.Ps, cr.Pe
	}

	ratios, err := s.fmp.GetRatiosTTM(ctx, ticker)
	if err != nil || len(ratios) == 0 {
		if err != nil {
			slog.Debug("ratios TTM failed", "ticker", ticker, "error", err)
		}
		return nil, nil
	}

	r := ratios[0]
	cr = cachedRatios{}
	if r.PriceToSalesRatioTTM != 0 {
		cr.Ps = float64Ptr(r.PriceToSalesRatioTTM)
	}
	if r.PriceToEarningsRatioTTM != 0 {
		cr.Pe = float64Ptr(r.PriceToEarningsRatioTTM)
	}

	if err := s.cache.Set(ctx, "ratios_ttm", ticker, &cr); err != nil {
		slog.Debug("ratios cache set failed", "ticker", ticker, "error", err)
	}

	return cr.Ps, cr.Pe
}

// fetchHistorical fetches 1Y daily bars for sparklines and return calculations.
func (s *Service) fetchHistorical(ctx context.Context, tickers []string, entries []StockEntry, tickerIndex map[string]int, mu *sync.Mutex) {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(maxConcurrent)

	now := time.Now()
	oneYearAgo := now.AddDate(-1, 0, 0)

	for _, ticker := range tickers {
		g.Go(func() error {
			bars := s.getCachedBars(gCtx, ticker, oneYearAgo, now)
			if len(bars) == 0 {
				return nil
			}

			sparkline := sampleSparkline(bars, sparklinePoints)
			chartData := extractCloses(bars)
			ytd, oneMonth, oneYear := calculateReturns(bars, now)
			yearHigh, yearLow := calculateHighLow(bars)

			mu.Lock()
			idx := tickerIndex[ticker]
			entries[idx].Sparkline = sparkline
			entries[idx].ChartData1Y = chartData
			entries[idx].YtdChange = ytd
			entries[idx].OneMonthChange = oneMonth
			entries[idx].OneYearChange = oneYear
			entries[idx].YearHigh = yearHigh
			entries[idx].YearLow = yearLow
			if yearHigh != nil && *yearHigh > 0 && entries[idx].Price > 0 {
				from52w := ((entries[idx].Price - *yearHigh) / *yearHigh) * 100
				entries[idx].From52wHigh = float64Ptr(math.Round(from52w*100) / 100)
			}
			mu.Unlock()
			return nil
		})
	}
	_ = g.Wait()
}

// getCachedBars retrieves daily bars from cache or Massive.
func (s *Service) getCachedBars(ctx context.Context, ticker string, from, to time.Time) []massive.Bar {
	var cached []massive.Bar
	if hit, err := s.cache.Get(ctx, "daily_bars", ticker, &cached); err == nil && hit {
		return cached
	}

	bars, err := s.massive.GetDailyBars(ctx, ticker, from, to)
	if err != nil {
		slog.Debug("daily bars failed", "ticker", ticker, "error", err)
		return nil
	}
	if len(bars) == 0 {
		return nil
	}

	if err := s.cache.Set(ctx, "daily_bars", ticker, bars); err != nil {
		slog.Debug("daily bars cache set failed", "ticker", ticker, "error", err)
	}

	return bars
}

// --- Computation helpers ---

// sampleSparkline samples N evenly-spaced close prices from bars.
func sampleSparkline(bars []massive.Bar, points int) []float64 {
	if len(bars) <= points {
		return extractCloses(bars)
	}

	sparkline := make([]float64, 0, points)
	step := float64(len(bars)) / float64(points)
	for i := 0; i < points; i++ {
		idx := int(float64(i) * step)
		if idx >= len(bars) {
			idx = len(bars) - 1
		}
		sparkline = append(sparkline, bars[idx].Close)
	}
	return sparkline
}

// extractCloses returns all close prices from bars.
func extractCloses(bars []massive.Bar) []float64 {
	closes := make([]float64, len(bars))
	for i, b := range bars {
		closes[i] = b.Close
	}
	return closes
}

// calculateReturns computes YTD, 1-month, and 1-year returns from bar data.
func calculateReturns(bars []massive.Bar, now time.Time) (ytd, oneMonth, oneYear *float64) {
	if len(bars) < 2 {
		return nil, nil, nil
	}

	currentPrice := bars[len(bars)-1].Close
	if currentPrice == 0 {
		return nil, nil, nil
	}

	ytdStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	oneMonthAgo := now.AddDate(0, -1, 0)

	// 1-year return: first bar vs last
	firstClose := bars[0].Close
	if firstClose > 0 {
		ret := ((currentPrice - firstClose) / firstClose) * 100
		oneYear = float64Ptr(math.Round(ret*100) / 100)
	}

	// YTD: find first bar on or after Jan 1
	for _, b := range bars {
		barTime := time.UnixMilli(b.Timestamp).UTC()
		if !barTime.Before(ytdStart) && b.Close > 0 {
			ret := ((currentPrice - b.Close) / b.Close) * 100
			ytd = float64Ptr(math.Round(ret*100) / 100)
			break
		}
	}

	// 1-month: find first bar on or after 1 month ago
	for _, b := range bars {
		barTime := time.UnixMilli(b.Timestamp).UTC()
		if !barTime.Before(oneMonthAgo) && b.Close > 0 {
			ret := ((currentPrice - b.Close) / b.Close) * 100
			oneMonth = float64Ptr(math.Round(ret*100) / 100)
			break
		}
	}

	return ytd, oneMonth, oneYear
}

// calculateHighLow finds the 52-week high and low from bars.
func calculateHighLow(bars []massive.Bar) (*float64, *float64) {
	if len(bars) == 0 {
		return nil, nil
	}

	high := bars[0].High
	low := bars[0].Low
	for _, b := range bars[1:] {
		if b.High > high {
			high = b.High
		}
		if b.Low < low && b.Low > 0 {
			low = b.Low
		}
	}

	return float64Ptr(high), float64Ptr(low)
}

// calculateRSRank assigns a 1-99 relative strength rank based on 1Y return
// within the set of stocks. Rank 99 = best performer, rank 1 = worst.
func calculateRSRank(entries []StockEntry) {
	type ranked struct {
		idx       int
		oneYearRet float64
	}

	var withReturns []ranked
	for i, e := range entries {
		if e.OneYearChange != nil {
			withReturns = append(withReturns, ranked{idx: i, oneYearRet: *e.OneYearChange})
		}
	}

	if len(withReturns) == 0 {
		return
	}

	// Sort ascending by 1Y return
	sort.Slice(withReturns, func(i, j int) bool {
		return withReturns[i].oneYearRet < withReturns[j].oneYearRet
	})

	for rank, r := range withReturns {
		percentile := int(math.Round(float64(rank+1) / float64(len(withReturns)) * 98)) + 1
		entries[r.idx].RSRank = intPtr(percentile)
	}
}

// calculateSummary computes aggregate metrics for the sector.
func calculateSummary(entries []StockEntry) OverviewSummary {
	var psVals, peVals, ytdVals, oneYearVals []float64

	for _, e := range entries {
		if e.Ps != nil {
			psVals = append(psVals, *e.Ps)
		}
		if e.Pe != nil && *e.Pe > 0 {
			peVals = append(peVals, *e.Pe)
		}
		if e.YtdChange != nil {
			ytdVals = append(ytdVals, *e.YtdChange)
		}
		if e.OneYearChange != nil {
			oneYearVals = append(oneYearVals, *e.OneYearChange)
		}
	}

	summary := OverviewSummary{}
	if len(psVals) > 0 {
		summary.AvgPs = float64Ptr(math.Round(avg(psVals)*100) / 100)
	}
	if len(peVals) > 0 {
		summary.AvgPe = float64Ptr(math.Round(avg(peVals)*100) / 100)
	}
	if len(ytdVals) > 0 {
		summary.MedianYtd = float64Ptr(math.Round(median(ytdVals)*100) / 100)
	}
	if len(oneYearVals) > 0 {
		summary.Median1y = float64Ptr(math.Round(median(oneYearVals)*100) / 100)
	}

	return summary
}

// sortStocks sorts entries by the given field.
func sortStocks(entries []StockEntry, field string) {
	switch field {
	case "52whigh":
		sort.Slice(entries, func(i, j int) bool {
			return derefOr(entries[i].From52wHigh, -math.MaxFloat64) > derefOr(entries[j].From52wHigh, -math.MaxFloat64)
		})
	case "ytd":
		sort.Slice(entries, func(i, j int) bool {
			return derefOr(entries[i].YtdChange, -math.MaxFloat64) > derefOr(entries[j].YtdChange, -math.MaxFloat64)
		})
	case "1y":
		sort.Slice(entries, func(i, j int) bool {
			return derefOr(entries[i].OneYearChange, -math.MaxFloat64) > derefOr(entries[j].OneYearChange, -math.MaxFloat64)
		})
	case "marketcap":
		sort.Slice(entries, func(i, j int) bool {
			return entries[i].MarketCap > entries[j].MarketCap
		})
	case "ps":
		sort.Slice(entries, func(i, j int) bool {
			return derefOr(entries[i].Ps, math.MaxFloat64) < derefOr(entries[j].Ps, math.MaxFloat64)
		})
	case "pe":
		sort.Slice(entries, func(i, j int) bool {
			return derefOr(entries[i].Pe, math.MaxFloat64) < derefOr(entries[j].Pe, math.MaxFloat64)
		})
	}
}

// --- Utility functions ---

func avg(vals []float64) float64 {
	var sum float64
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}

func median(vals []float64) float64 {
	sorted := make([]float64, len(vals))
	copy(sorted, vals)
	sort.Float64s(sorted)

	n := len(sorted)
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}

func derefOr(p *float64, fallback float64) float64 {
	if p != nil {
		return *p
	}
	return fallback
}

func float64Ptr(v float64) *float64 { return &v }
func boolPtr(v bool) *bool          { return &v }
func intPtr(v int) *int             { return &v }
