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
	"golang.org/x/sync/singleflight"

	"github.com/drewjst/crux/apps/api/internal/infrastructure/cache"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/massive"
)

// ValidSectors lists the supported GICS sector names plus custom watchlists.
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
	// Custom curated watchlists
	"Dow 30",
	"Software",
}

// CustomSectors maps custom sector names to their curated ticker lists.
// These bypass the FMP screener and use batch quotes instead.
var CustomSectors = map[string][]string{
	"Dow 30": {
		"AAPL", "AMGN", "AMZN", "AXP", "BA", "CAT", "CRM", "CSCO",
		"CVX", "DIS", "GS", "HD", "HON", "IBM", "JNJ", "JPM",
		"KO", "MCD", "MMM", "MRK", "MSFT", "NKE", "NVDA", "PG",
		"SHW", "TRV", "UNH", "V", "VZ", "WMT",
	},
	"Software": {
		"FIG", "TTD", "DUOL", "HUBS", "MNDY", "WIX", "TEAM", "ASAN",
		"CVLT", "DOCS", "KVYO", "BRZE", "IOT", "GTLB", "NOW", "DOCU",
		"GWRE", "ESTC", "CLBT", "CRM", "WDAY", "INTU", "ADBE", "SAP",
		"DDOG", "VEEV", "SNOW", "ZETA", "ADP", "FSLY", "ADSK", "CFLT",
		"TWLO", "MDB", "ZM",
	},
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

// IsCustomSector reports whether the sector uses a curated ticker list.
func IsCustomSector(sector string) bool {
	_, ok := CustomSectors[sector]
	return ok
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
	Roic           *float64  `json:"roic"`
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
	sfRatios     singleflight.Group
	sfTechnicals singleflight.Group
	sfPrices     singleflight.Group
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

	// 2. Get stock list — custom watchlist or FMP screener
	var tickers []string
	var entries []StockEntry
	var err error

	if customTickers, ok := CustomSectors[sectorName]; ok {
		tickers, entries, err = s.getCustomSectorEntries(ctx, customTickers)
	} else {
		tickers, entries, err = s.getScreenerEntries(ctx, sectorName, limit)
	}
	if err != nil {
		return nil, fmt.Errorf("stock list for %s: %w", sectorName, err)
	}
	if len(entries) == 0 {
		return &SectorOverviewResponse{
			Sector:     sectorName,
			StockCount: 0,
			UpdatedAt:  time.Now().UTC(),
			Summary:    OverviewSummary{},
			Stocks:     []StockEntry{},
		}, nil
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

// getScreenerEntries fetches stocks via FMP screener and returns tickers + entries.
func (s *Service) getScreenerEntries(ctx context.Context, sector string, limit int) ([]string, []StockEntry, error) {
	cacheKey := sector
	var cached []fmp.ScreenerResult
	if hit, err := s.cache.Get(ctx, "screener", cacheKey, &cached); err != nil {
		slog.Warn("screener cache get failed", "error", err)
	} else if hit {
		if len(cached) > limit {
			cached = cached[:limit]
		}
		t, e := screenerToEntries(cached)
		return t, e, nil
	}

	results, err := s.fmp.GetStockScreener(ctx, sector, limit)
	if err != nil {
		return nil, nil, err
	}

	if err := s.cache.Set(ctx, "screener", cacheKey, results); err != nil {
		slog.Warn("screener cache set failed", "error", err)
	}

	t, e := screenerToEntries(results)
	return t, e, nil
}

// screenerToEntries converts screener results to tickers and stock entries.
func screenerToEntries(results []fmp.ScreenerResult) ([]string, []StockEntry) {
	tickers := make([]string, len(results))
	entries := make([]StockEntry, len(results))
	for i, sr := range results {
		tickers[i] = sr.Symbol
		entries[i] = StockEntry{
			Ticker:    sr.Symbol,
			Name:      sr.Name,
			LogoURL:   sr.Image,
			Price:     sr.Price,
			MarketCap: sr.MarketCap,
		}
	}
	return tickers, entries
}

// getCustomSectorEntries fetches stock data for a curated ticker list via batch quotes.
func (s *Service) getCustomSectorEntries(ctx context.Context, tickers []string) ([]string, []StockEntry, error) {
	quotes, err := s.fmp.GetBatchQuotes(ctx, tickers)
	if err != nil {
		return nil, nil, fmt.Errorf("batch quotes: %w", err)
	}

	resultTickers := make([]string, 0, len(quotes))
	entries := make([]StockEntry, 0, len(quotes))
	for _, q := range quotes {
		resultTickers = append(resultTickers, q.Symbol)
		entries = append(entries, StockEntry{
			Ticker:    q.Symbol,
			Name:      q.Name,
			Price:     q.Price,
			MarketCap: q.MarketCap,
		})
	}

	return resultTickers, entries, nil
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
			price := entries[tickerIndex[ticker]].Price
			v, err, _ := s.sfTechnicals.Do(ticker, func() (interface{}, error) {
				return s.getCachedTechnicals(gCtx, ticker, price)
			})
			if err != nil {
				slog.Debug("technicals failed", "ticker", ticker, "error", err)
				return nil // non-fatal
			}
			if v == nil {
				return nil
			}

			ti := v.(*massive.TechnicalIndicators)
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

	type ratiosResult struct {
		ps, pe, roic *float64
	}

	for _, ticker := range tickers {
		g.Go(func() error {
			v, _, _ := s.sfRatios.Do(ticker, func() (interface{}, error) {
				ps, pe, roic := s.getCachedRatios(gCtx, ticker)
				return ratiosResult{ps, pe, roic}, nil
			})
			r := v.(ratiosResult)
			mu.Lock()
			idx := tickerIndex[ticker]
			entries[idx].Ps = r.ps
			entries[idx].Pe = r.pe
			entries[idx].Roic = r.roic
			mu.Unlock()
			return nil
		})
	}
	_ = g.Wait()
}

// getCachedRatios retrieves P/S, P/E, and ROIC from cache or FMP.
// On cache miss, fetches RatiosTTM and KeyMetricsTTM in parallel.
func (s *Service) getCachedRatios(ctx context.Context, ticker string) (*float64, *float64, *float64) {
	type cachedRatios struct {
		Ps   *float64 `json:"ps"`
		Pe   *float64 `json:"pe"`
		Roic *float64 `json:"roic"`
	}

	var cr cachedRatios
	if hit, err := s.cache.Get(ctx, "ratios_ttm", ticker, &cr); err == nil && hit {
		return cr.Ps, cr.Pe, cr.Roic
	}

	cr = cachedRatios{}

	// Fetch ratios TTM and key metrics TTM in parallel
	var wg sync.WaitGroup
	var mu sync.Mutex

	wg.Add(2)

	go func() {
		defer wg.Done()
		ratios, err := s.fmp.GetRatiosTTM(ctx, ticker)
		if err != nil {
			slog.Debug("ratios TTM failed", "ticker", ticker, "error", err)
			return
		}
		if len(ratios) > 0 {
			r := ratios[0]
			mu.Lock()
			if r.PriceToSalesRatioTTM != 0 {
				cr.Ps = float64Ptr(r.PriceToSalesRatioTTM)
			}
			if r.PriceToEarningsRatioTTM != 0 {
				cr.Pe = float64Ptr(r.PriceToEarningsRatioTTM)
			}
			mu.Unlock()
		}
	}()

	go func() {
		defer wg.Done()
		metrics, err := s.fmp.GetKeyMetricsTTM(ctx, ticker)
		if err != nil {
			slog.Debug("key metrics TTM failed", "ticker", ticker, "error", err)
			return
		}
		if len(metrics) > 0 && metrics[0].ReturnOnInvestedCapitalTTM != 0 {
			mu.Lock()
			cr.Roic = float64Ptr(metrics[0].ReturnOnInvestedCapitalTTM * 100)
			mu.Unlock()
		}
	}()

	wg.Wait()

	if err := s.cache.Set(ctx, "ratios_ttm", ticker, &cr); err != nil {
		slog.Debug("ratios cache set failed", "ticker", ticker, "error", err)
	}

	return cr.Ps, cr.Pe, cr.Roic
}

// fetchHistorical fetches 1Y daily prices from FMP for sparklines and return calculations.
func (s *Service) fetchHistorical(ctx context.Context, tickers []string, entries []StockEntry, tickerIndex map[string]int, mu *sync.Mutex) {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(maxConcurrent)

	now := time.Now()
	oneYearAgo := now.AddDate(-1, 0, 0)
	fromDate := oneYearAgo.Format("2006-01-02")

	for _, ticker := range tickers {
		g.Go(func() error {
			v, _, _ := s.sfPrices.Do(ticker, func() (interface{}, error) {
				return s.getCachedPrices(gCtx, ticker, fromDate), nil
			})
			prices := v.([]fmp.HistoricalPrice)
			if len(prices) == 0 {
				return nil
			}

			sparkline := sampleSparklinePrices(prices, sparklinePoints)
			chartData := extractClosePrices(prices)
			ytd, oneMonth, oneYear := calculateReturnsPrices(prices, now)
			yearHigh, yearLow := calculateHighLowPrices(prices)

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

// getCachedPrices retrieves daily prices from cache or FMP.
func (s *Service) getCachedPrices(ctx context.Context, ticker string, fromDate string) []fmp.HistoricalPrice {
	var cached []fmp.HistoricalPrice
	if hit, err := s.cache.Get(ctx, "daily_bars", ticker, &cached); err == nil && hit {
		return cached
	}

	prices, err := s.fmp.GetHistoricalPrices(ctx, ticker, fromDate)
	if err != nil {
		slog.Warn("historical prices failed", "ticker", ticker, "error", err)
		return nil
	}
	if len(prices) == 0 {
		return nil
	}

	// FMP returns newest-first; reverse to oldest-first for calculations
	for i, j := 0, len(prices)-1; i < j; i, j = i+1, j-1 {
		prices[i], prices[j] = prices[j], prices[i]
	}

	if err := s.cache.Set(ctx, "daily_bars", ticker, prices); err != nil {
		slog.Debug("daily prices cache set failed", "ticker", ticker, "error", err)
	}

	return prices
}

// --- Computation helpers (FMP HistoricalPrice-based, oldest-first order) ---

// sampleSparklinePrices samples N evenly-spaced close prices from historical prices.
func sampleSparklinePrices(prices []fmp.HistoricalPrice, points int) []float64 {
	if len(prices) <= points {
		return extractClosePrices(prices)
	}

	sparkline := make([]float64, 0, points)
	step := float64(len(prices)) / float64(points)
	for i := 0; i < points; i++ {
		idx := int(float64(i) * step)
		if idx >= len(prices) {
			idx = len(prices) - 1
		}
		sparkline = append(sparkline, prices[idx].Close)
	}
	return sparkline
}

// extractClosePrices returns all close prices from historical prices.
func extractClosePrices(prices []fmp.HistoricalPrice) []float64 {
	closes := make([]float64, len(prices))
	for i, p := range prices {
		closes[i] = p.Close
	}
	return closes
}

// calculateReturnsPrices computes YTD, 1-month, and 1-year returns from FMP price data.
// Expects prices sorted oldest-first.
func calculateReturnsPrices(prices []fmp.HistoricalPrice, now time.Time) (ytd, oneMonth, oneYear *float64) {
	if len(prices) < 2 {
		return nil, nil, nil
	}

	currentPrice := prices[len(prices)-1].Close
	if currentPrice == 0 {
		return nil, nil, nil
	}

	ytdStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	oneMonthAgo := now.AddDate(0, -1, 0)

	// 1-year return: first price vs last
	firstClose := prices[0].Close
	if firstClose > 0 {
		ret := ((currentPrice - firstClose) / firstClose) * 100
		oneYear = float64Ptr(math.Round(ret*100) / 100)
	}

	// YTD: find first price on or after Jan 1
	for _, p := range prices {
		barDate, err := time.Parse("2006-01-02", p.Date)
		if err != nil {
			continue
		}
		if !barDate.Before(ytdStart) && p.Close > 0 {
			ret := ((currentPrice - p.Close) / p.Close) * 100
			ytd = float64Ptr(math.Round(ret*100) / 100)
			break
		}
	}

	// 1-month: find first price on or after 1 month ago
	for _, p := range prices {
		barDate, err := time.Parse("2006-01-02", p.Date)
		if err != nil {
			continue
		}
		if !barDate.Before(oneMonthAgo) && p.Close > 0 {
			ret := ((currentPrice - p.Close) / p.Close) * 100
			oneMonth = float64Ptr(math.Round(ret*100) / 100)
			break
		}
	}

	return ytd, oneMonth, oneYear
}

// calculateHighLowPrices finds the 52-week high and low from historical prices.
func calculateHighLowPrices(prices []fmp.HistoricalPrice) (*float64, *float64) {
	if len(prices) == 0 {
		return nil, nil
	}

	high := prices[0].High
	low := prices[0].Low
	for _, p := range prices[1:] {
		if p.High > high {
			high = p.High
		}
		if p.Low < low && p.Low > 0 {
			low = p.Low
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
