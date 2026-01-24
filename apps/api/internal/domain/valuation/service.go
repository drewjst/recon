// Package valuation provides valuation analysis and verdict calculation.
package valuation

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sort"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers"
	"golang.org/x/sync/errgroup"
)

const (
	// HistoricalQuarters is the number of quarters to fetch for historical analysis.
	// 20 quarters = 5 years of data, sufficient for percentile calculations.
	HistoricalQuarters = 20
	// MaxPeers is the maximum number of peers to fetch ratios for.
	// Limited to 6 to reduce API calls (each peer requires 2-3 API calls).
	MaxPeers = 6
)

// Service provides valuation analysis.
type Service struct {
	fundamentals providers.FundamentalsProvider
	quotes       providers.QuoteProvider
}

// NewService creates a new valuation service.
func NewService(fundamentals providers.FundamentalsProvider, quotes providers.QuoteProvider) *Service {
	return &Service{
		fundamentals: fundamentals,
		quotes:       quotes,
	}
}

// GetTeaser returns a minimal valuation summary for the dashboard card.
func (s *Service) GetTeaser(ctx context.Context, ticker string) (*models.ValuationTeaser, error) {
	// Get current ratios to determine basic valuation
	ratios, err := s.fundamentals.GetRatios(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching ratios for teaser: %w", err)
	}
	if ratios == nil || ratios.PE <= 0 {
		return nil, nil
	}

	// Simplified teaser based on PEG ratio
	sentiment := "fair"
	headline := "Valuation data available"

	if ratios.PEG > 0 {
		switch {
		case ratios.PEG < 1.0:
			sentiment = "cheap"
			headline = fmt.Sprintf("PEG of %.1f suggests undervaluation", ratios.PEG)
		case ratios.PEG > 2.0:
			sentiment = "expensive"
			headline = fmt.Sprintf("PEG of %.1f suggests premium pricing", ratios.PEG)
		default:
			headline = fmt.Sprintf("PEG of %.1f suggests fair valuation", ratios.PEG)
		}
	} else if ratios.PE > 0 {
		headline = fmt.Sprintf("Trading at %.1fx earnings", ratios.PE)
	}

	return &models.ValuationTeaser{
		Sentiment: sentiment,
		Headline:  headline,
	}, nil
}

// GetDeepDive returns full valuation analysis for the deep dive page.
func (s *Service) GetDeepDive(ctx context.Context, ticker string) (*models.ValuationDeepDive, error) {
	var (
		company          *models.Company
		ratios           *models.Ratios
		historicalRatios []models.QuarterlyRatio
		peers            []string
		peerRatios       []peerRatio
		dcf              *models.DCF
		sectorPE         *models.SectorPE
	)

	g, gctx := errgroup.WithContext(ctx)

	// Fetch company info
	g.Go(func() error {
		var err error
		company, err = s.fundamentals.GetCompany(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch company for valuation", "ticker", ticker, "error", err)
		}
		return nil
	})

	// Fetch current ratios
	g.Go(func() error {
		var err error
		ratios, err = s.fundamentals.GetRatios(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch ratios for valuation", "ticker", ticker, "error", err)
		}
		return nil
	})

	// Fetch historical ratios (5 years of quarterly data)
	g.Go(func() error {
		var err error
		historicalRatios, err = s.fundamentals.GetQuarterlyRatios(gctx, ticker, HistoricalQuarters)
		if err != nil {
			slog.Warn("failed to fetch historical ratios", "ticker", ticker, "error", err)
		}
		return nil
	})

	// Fetch peer list
	g.Go(func() error {
		var err error
		peers, err = s.fundamentals.GetStockPeers(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch peers", "ticker", ticker, "error", err)
		} else {
			slog.Debug("fetched peers", "ticker", ticker, "peerCount", len(peers), "peers", peers)
		}
		return nil
	})

	// Fetch DCF data
	g.Go(func() error {
		var err error
		dcf, err = s.fundamentals.GetDCF(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch DCF", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching valuation data: %w", err)
	}

	// Check if we have any valuation data at all
	if ratios == nil {
		return nil, nil
	}
	// Allow stocks with negative P/E if they have other metrics (Forward P/E, PEG, etc.)
	hasAnyValuationMetric := ratios.PE > 0 || ratios.ForwardPE > 0 || ratios.PEG > 0 ||
		ratios.EVToEBITDA > 0 || ratios.PS > 0 || ratios.PB > 0 || ratios.PriceToFCF > 0
	if !hasAnyValuationMetric {
		return nil, nil
	}

	// Fetch sector P/E and industry P/E (depends on company data being available)
	var industryPE *models.IndustryPE
	if company != nil {
		exchange := "NASDAQ" // Default to NASDAQ
		if company.Exchange != "" {
			exchange = company.Exchange
		}
		// Fetch sector P/E
		if company.Sector != "" {
			var err error
			sectorPE, err = s.fundamentals.GetSectorPE(ctx, company.Sector, exchange)
			if err != nil {
				slog.Warn("failed to fetch sector P/E", "sector", company.Sector, "error", err)
			}
		}
		// Fetch industry P/E (more granular)
		if company.Industry != "" {
			var err error
			industryPE, err = s.fundamentals.GetIndustryPE(ctx, company.Industry, exchange)
			if err != nil {
				slog.Warn("failed to fetch industry P/E", "industry", company.Industry, "error", err)
			}
		}
	}

	// Use industry P/E as fallback if sector P/E unavailable
	if sectorPE == nil && industryPE != nil {
		sectorPE = &models.SectorPE{
			Date:     industryPE.Date,
			Sector:   industryPE.Industry, // Use industry name as sector
			Exchange: industryPE.Exchange,
			PE:       industryPE.PE,
		}
	}

	// Fetch peer P/E ratios
	if len(peers) > 0 {
		peerRatios = s.fetchPeerRatios(ctx, peers)
		slog.Debug("fetched peer ratios", "ticker", ticker, "peerRatiosCount", len(peerRatios))
	} else {
		slog.Debug("no peers found", "ticker", ticker)
	}

	// Build the deep dive response
	return s.buildDeepDive(ticker, company, ratios, historicalRatios, peerRatios, dcf, sectorPE), nil
}

// peerRatio holds all valuation metrics for a peer company.
type peerRatio struct {
	Ticker     string
	Name       string
	PE         *float64
	EVToEBITDA *float64
	PS         *float64
	PB         *float64
	PriceToFCF *float64
	PEG        *float64
	Growth     *float64 // EPS growth rate
}

// fetchPeerRatios fetches full valuation ratios for peer companies.
func (s *Service) fetchPeerRatios(ctx context.Context, peers []string) []peerRatio {
	// Limit peers
	if len(peers) > MaxPeers {
		peers = peers[:MaxPeers]
	}

	result := make([]peerRatio, 0, len(peers))
	resultChan := make(chan peerRatio, len(peers))

	// Fetch each peer's ratios in parallel
	g, gctx := errgroup.WithContext(ctx)
	for _, peer := range peers {
		peer := peer
		g.Go(func() error {
			company, _ := s.fundamentals.GetCompany(gctx, peer)
			ratios, err := s.fundamentals.GetRatios(gctx, peer)
			if err != nil {
				slog.Debug("failed to fetch peer ratios", "peer", peer, "error", err)
				return nil
			}

			// Fetch analyst estimates to get growth rate
			estimates, _ := s.fundamentals.GetAnalystEstimates(gctx, peer)

			name := peer
			if company != nil {
				name = company.Name
			}

			pr := peerRatio{Ticker: peer, Name: name}
			if ratios != nil {
				if ratios.PE > 0 {
					pe := ratios.PE
					pr.PE = &pe
				}
				if ratios.EVToEBITDA > 0 {
					ev := ratios.EVToEBITDA
					pr.EVToEBITDA = &ev
				}
				if ratios.PS > 0 {
					ps := ratios.PS
					pr.PS = &ps
				}
				if ratios.PB > 0 {
					pb := ratios.PB
					pr.PB = &pb
				}
				if ratios.PriceToFCF > 0 {
					fcf := ratios.PriceToFCF
					pr.PriceToFCF = &fcf
				}
				if ratios.PEG > 0 {
					peg := ratios.PEG
					pr.PEG = &peg
				}
			}

			// Get growth rate from analyst estimates
			if estimates != nil && estimates.EPSGrowthNextY != 0 {
				growth := estimates.EPSGrowthNextY
				pr.Growth = &growth
			}

			resultChan <- pr
			return nil
		})
	}

	go func() {
		g.Wait()
		close(resultChan)
	}()

	for pr := range resultChan {
		result = append(result, pr)
	}

	// Sort by ticker for consistent ordering
	sort.Slice(result, func(i, j int) bool {
		return result[i].Ticker < result[j].Ticker
	})

	return result
}

// buildDeepDive constructs the ValuationDeepDive response with scores.
func (s *Service) buildDeepDive(
	ticker string,
	company *models.Company,
	ratios *models.Ratios,
	historicalRatios []models.QuarterlyRatio,
	peerRatios []peerRatio,
	dcf *models.DCF,
	sectorPE *models.SectorPE,
) *models.ValuationDeepDive {
	companyName := ticker
	if company != nil {
		companyName = company.Name
	}

	result := &models.ValuationDeepDive{
		Ticker:      ticker,
		CompanyName: companyName,
		Signals:     []models.ValuationSignal{},
	}

	currentPE := ratios.PE

	// Calculate historical score (only if P/E is valid)
	if currentPE > 0 && len(historicalRatios) > 0 {
		histScore, histContext := s.calculateHistoricalScore(currentPE, historicalRatios)
		result.HistoricalScore = histScore
		result.HistoricalContext = histContext
	}

	// Calculate sector score (only if P/E is valid)
	if currentPE > 0 && len(peerRatios) > 0 {
		sectorScore, sectorContext := s.calculateSectorScore(currentPE, peerRatios)
		result.SectorScore = sectorScore
		result.SectorContext = sectorContext

		// Generate peer comparison insight
		if sectorContext != nil {
			sectorContext.Insight = s.generatePeerInsight(ticker, ratios, sectorContext)
		}
	}

	// Calculate growth score (PEG-based)
	if ratios.PEG > 0 {
		growthScore, growthContext := s.calculateGrowthScore(ratios)
		result.GrowthScore = growthScore
		result.GrowthContext = growthContext
	}

	// Build key metrics with comparison context
	result.KeyMetrics = s.buildKeyMetrics(ratios, historicalRatios, peerRatios, sectorPE)

	// Build DCF analysis
	result.DCFAnalysis = s.buildDCFAnalysis(dcf, ratios)

	// Generate valuation signals
	result.Signals = s.generateValuationSignals(result, ratios)

	// Generate verdict
	result.Verdict, result.Sentiment = s.generateVerdict(result)

	return result
}

// S&P 500 approximate average valuation metrics (as of late 2024/early 2025)
var spAverages = map[string]float64{
	"pe":         24.0,
	"forwardPE":  21.0,
	"evToEbitda": 14.0,
	"ps":         2.8,
	"priceToFcf": 18.5,
	"pb":         4.5,
	"peg":        1.9,
}

// buildKeyMetrics constructs key valuation metrics with comparison context.
func (s *Service) buildKeyMetrics(
	ratios *models.Ratios,
	historicalRatios []models.QuarterlyRatio,
	peerRatios []peerRatio,
	sectorPE *models.SectorPE,
) []models.ValuationMetricRow {
	metrics := []models.ValuationMetricRow{}

	// Calculate 5Y averages from historical data
	fiveYearAvgs := s.calculateHistoricalAverages(historicalRatios)

	// Calculate sector medians from peer ratios
	sectorMedians := s.calculateSectorMedians(peerRatios)

	// Use real sector P/E if available
	if sectorPE != nil && sectorPE.PE > 0 {
		sectorMedians["pe"] = &sectorPE.PE
	}

	// P/E TTM
	if ratios.PE > 0 {
		current := ratios.PE
		fiveYr := fiveYearAvgs["pe"]
		sector := sectorMedians["pe"]
		spAvg := spAverages["pe"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "pe",
			Label:         "P/E TTM",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// Forward P/E
	if ratios.ForwardPE > 0 {
		current := ratios.ForwardPE
		spAvg := spAverages["forwardPE"]
		percentile := s.calculateMetricPercentile(current, nil, nil, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "forwardPE",
			Label:         "Forward P/E",
			Current:       &current,
			FiveYearAvg:   nil, // Forward P/E doesn't have historical context
			SectorMedian:  nil,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// EV/EBITDA
	if ratios.EVToEBITDA > 0 {
		current := ratios.EVToEBITDA
		fiveYr := fiveYearAvgs["evToEbitda"]
		sector := sectorMedians["evToEbitda"]
		spAvg := spAverages["evToEbitda"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "evToEbitda",
			Label:         "EV/EBITDA",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// P/S
	if ratios.PS > 0 {
		current := ratios.PS
		fiveYr := fiveYearAvgs["ps"]
		sector := sectorMedians["ps"]
		spAvg := spAverages["ps"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "ps",
			Label:         "P/S",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// P/FCF
	if ratios.PriceToFCF > 0 {
		current := ratios.PriceToFCF
		fiveYr := fiveYearAvgs["priceToFcf"]
		sector := sectorMedians["priceToFcf"]
		spAvg := spAverages["priceToFcf"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "priceToFcf",
			Label:         "P/FCF",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// P/B (Price to Book)
	if ratios.PB > 0 {
		current := ratios.PB
		fiveYr := fiveYearAvgs["pb"]
		sector := sectorMedians["pb"]
		spAvg := spAverages["pb"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, false)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "pb",
			Label:         "P/B",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	// PEG
	if ratios.PEG > 0 {
		current := ratios.PEG
		fiveYr := fiveYearAvgs["peg"]
		sector := sectorMedians["peg"]
		spAvg := spAverages["peg"]
		percentile := s.calculateMetricPercentile(current, fiveYr, sector, &spAvg, true)
		metrics = append(metrics, models.ValuationMetricRow{
			Key:           "peg",
			Label:         "PEG",
			Current:       &current,
			FiveYearAvg:   fiveYr,
			SectorMedian:  sector,
			SPAvg:         &spAvg,
			Percentile:    percentile,
			LowerIsBetter: true,
		})
	}

	return metrics
}

// calculateHistoricalAverages computes 5Y averages for each metric.
func (s *Service) calculateHistoricalAverages(history []models.QuarterlyRatio) map[string]*float64 {
	avgs := make(map[string]*float64)
	if len(history) == 0 {
		return avgs
	}

	// Sum up values for each metric
	var sumPE, sumPS, sumPB, sumFCF, sumEV, sumPEG float64
	var countPE, countPS, countPB, countFCF, countEV, countPEG int

	for _, h := range history {
		if h.PE > 0 {
			sumPE += h.PE
			countPE++
		}
		if h.PS > 0 {
			sumPS += h.PS
			countPS++
		}
		if h.PB > 0 {
			sumPB += h.PB
			countPB++
		}
		if h.PriceToFCF > 0 {
			sumFCF += h.PriceToFCF
			countFCF++
		}
		if h.EVToEBITDA > 0 {
			sumEV += h.EVToEBITDA
			countEV++
		}
		if h.PEG > 0 {
			sumPEG += h.PEG
			countPEG++
		}
	}

	if countPE > 0 {
		avg := sumPE / float64(countPE)
		avgs["pe"] = &avg
	}
	if countPS > 0 {
		avg := sumPS / float64(countPS)
		avgs["ps"] = &avg
	}
	if countPB > 0 {
		avg := sumPB / float64(countPB)
		avgs["pb"] = &avg
	}
	if countFCF > 0 {
		avg := sumFCF / float64(countFCF)
		avgs["priceToFcf"] = &avg
	}
	if countEV > 0 {
		avg := sumEV / float64(countEV)
		avgs["evToEbitda"] = &avg
	}
	if countPEG > 0 {
		avg := sumPEG / float64(countPEG)
		avgs["peg"] = &avg
	}

	return avgs
}

// calculateSectorMedians computes median metrics from peer ratios.
func (s *Service) calculateSectorMedians(peers []peerRatio) map[string]*float64 {
	medians := make(map[string]*float64)
	if len(peers) == 0 {
		return medians
	}

	// Collect values for each metric
	var peerPEs, peerEVs, peerPSs, peerPBs, peerFCFs []float64
	for _, p := range peers {
		if p.PE != nil && *p.PE > 0 {
			peerPEs = append(peerPEs, *p.PE)
		}
		if p.EVToEBITDA != nil && *p.EVToEBITDA > 0 {
			peerEVs = append(peerEVs, *p.EVToEBITDA)
		}
		if p.PS != nil && *p.PS > 0 {
			peerPSs = append(peerPSs, *p.PS)
		}
		if p.PB != nil && *p.PB > 0 {
			peerPBs = append(peerPBs, *p.PB)
		}
		if p.PriceToFCF != nil && *p.PriceToFCF > 0 {
			peerFCFs = append(peerFCFs, *p.PriceToFCF)
		}
	}

	// Calculate medians
	if median := calculateMedian(peerPEs); median != nil {
		medians["pe"] = median
	}
	if median := calculateMedian(peerEVs); median != nil {
		medians["evToEbitda"] = median
	}
	if median := calculateMedian(peerPSs); median != nil {
		medians["ps"] = median
	}
	if median := calculateMedian(peerPBs); median != nil {
		medians["pb"] = median
	}
	if median := calculateMedian(peerFCFs); median != nil {
		medians["priceToFcf"] = median
	}

	return medians
}

// calculateMedian returns the median of a slice of float64 values.
func calculateMedian(values []float64) *float64 {
	if len(values) == 0 {
		return nil
	}
	sort.Float64s(values)
	n := len(values)
	var median float64
	if n%2 == 0 {
		median = (values[n/2-1] + values[n/2]) / 2
	} else {
		median = values[n/2]
	}
	return &median
}

// calculateMetricPercentile calculates where current value sits relative to comparisons.
// Returns a value from 0-100 where higher means more expensive (for standard metrics).
// Uses ratio-based positioning for more granular percentiles.
func (s *Service) calculateMetricPercentile(
	current float64,
	fiveYearAvg *float64,
	sectorMedian *float64,
	spAvg *float64,
	invertForDisplay bool,
) *float64 {
	// Collect all valid comparison values
	var comparisons []float64
	if fiveYearAvg != nil && *fiveYearAvg > 0 {
		comparisons = append(comparisons, *fiveYearAvg)
	}
	if sectorMedian != nil && *sectorMedian > 0 {
		comparisons = append(comparisons, *sectorMedian)
	}
	if spAvg != nil && *spAvg > 0 {
		comparisons = append(comparisons, *spAvg)
	}

	if len(comparisons) == 0 {
		return nil
	}

	// Calculate average of comparisons as the "fair value" baseline
	var sum float64
	for _, c := range comparisons {
		sum += c
	}
	avgComparison := sum / float64(len(comparisons))

	// Calculate percentile based on ratio to average
	// If current = avg, percentile = 50
	// If current = 2x avg, percentile ~= 85
	// If current = 0.5x avg, percentile ~= 15
	ratio := current / avgComparison

	// Map ratio to percentile using a sigmoid-like curve
	// ratio 0.5 -> ~15%, ratio 1.0 -> 50%, ratio 2.0 -> ~85%
	var percentile float64
	if ratio <= 0 {
		percentile = 0
	} else if ratio >= 3 {
		percentile = 100
	} else {
		// Use log scale for more intuitive distribution
		// log2(0.5) = -1 -> 15%, log2(1) = 0 -> 50%, log2(2) = 1 -> 85%
		logRatio := math.Log2(ratio)
		percentile = 50 + (logRatio * 35) // Scale: each doubling adds ~35 percentile points
		percentile = math.Max(0, math.Min(100, percentile))
	}

	return &percentile
}

// buildDCFAnalysis constructs DCF analysis from DCF data.
func (s *Service) buildDCFAnalysis(dcf *models.DCF, ratios *models.Ratios) *models.DCFAnalysis {
	if dcf == nil || dcf.DCFValue <= 0 || dcf.StockPrice <= 0 {
		return nil
	}

	diffPercent := ((dcf.DCFValue - dcf.StockPrice) / dcf.StockPrice) * 100
	marginOfSafety := diffPercent // Positive = undervalued

	// Determine assessment
	assessment := "Fairly Valued"
	if diffPercent > 15 {
		assessment = "Undervalued"
	} else if diffPercent < -15 {
		assessment = "Overvalued"
	}

	// Calculate implied growth rate (simplified reverse DCF)
	// Using Gordon Growth Model approximation: g = r - (E/P)
	// where r is discount rate (~10%) and E/P is earnings yield
	var impliedGrowth *float64
	if ratios != nil && ratios.PE > 0 {
		discountRate := 0.10 // 10% discount rate
		earningsYield := 1 / ratios.PE
		growth := discountRate - earningsYield
		impliedGrowth = &growth
	}

	return &models.DCFAnalysis{
		IntrinsicValue:    dcf.DCFValue,
		CurrentPrice:      dcf.StockPrice,
		DifferencePercent: diffPercent,
		MarginOfSafety:    marginOfSafety,
		ImpliedGrowthRate: impliedGrowth,
		Assessment:        assessment,
	}
}

// generateValuationSignals generates valuation-specific signals.
func (s *Service) generateValuationSignals(data *models.ValuationDeepDive, ratios *models.Ratios) []models.ValuationSignal {
	signals := []models.ValuationSignal{}

	// Historical valuation signal
	if data.HistoricalScore != nil {
		score := *data.HistoricalScore
		if score <= 3 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Historical Discount",
				Description: "Trading near 5-year lows relative to earnings",
				Sentiment:   "bullish",
			})
		} else if score >= 8 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Historical Premium",
				Description: "Trading near 5-year highs relative to earnings",
				Sentiment:   "bearish",
			})
		}
	}

	// Sector valuation signal
	if data.SectorScore != nil {
		score := *data.SectorScore
		if score <= 3 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Peer Discount",
				Description: "Cheaper than most sector peers",
				Sentiment:   "bullish",
			})
		} else if score >= 8 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Peer Premium",
				Description: "More expensive than most sector peers",
				Sentiment:   "bearish",
			})
		}
	}

	// PEG-based signal
	if ratios != nil && ratios.PEG > 0 {
		if ratios.PEG < 1.0 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Growth Bargain",
				Description: fmt.Sprintf("PEG of %.2f suggests undervaluation for growth", ratios.PEG),
				Sentiment:   "bullish",
			})
		} else if ratios.PEG > 2.0 {
			signals = append(signals, models.ValuationSignal{
				Name:        "Growth Premium",
				Description: fmt.Sprintf("PEG of %.2f suggests overvaluation for growth", ratios.PEG),
				Sentiment:   "bearish",
			})
		}
	}

	// DCF signal
	if data.DCFAnalysis != nil {
		if data.DCFAnalysis.Assessment == "Undervalued" {
			signals = append(signals, models.ValuationSignal{
				Name:        "Intrinsic Value Gap",
				Description: fmt.Sprintf("%.0f%% margin of safety based on DCF", data.DCFAnalysis.MarginOfSafety),
				Sentiment:   "bullish",
			})
		} else if data.DCFAnalysis.Assessment == "Overvalued" {
			signals = append(signals, models.ValuationSignal{
				Name:        "Premium to Intrinsic",
				Description: fmt.Sprintf("Trading %.0f%% above DCF value", math.Abs(data.DCFAnalysis.DifferencePercent)),
				Sentiment:   "bearish",
			})
		}
	}

	// Earnings yield signal
	if ratios != nil && ratios.PE > 0 {
		earningsYield := (1 / ratios.PE) * 100
		if earningsYield > 8 {
			signals = append(signals, models.ValuationSignal{
				Name:        "High Earnings Yield",
				Description: fmt.Sprintf("%.1f%% earnings yield exceeds typical bond returns", earningsYield),
				Sentiment:   "bullish",
			})
		}
	}

	return signals
}

// calculateHistoricalScore calculates where current P/E falls in 5Y range.
func (s *Service) calculateHistoricalScore(currentPE float64, history []models.QuarterlyRatio) (*int, *models.HistoricalContext) {
	if len(history) == 0 {
		return nil, nil
	}

	// Find min and max P/E
	minPE := history[0].PE
	maxPE := history[0].PE
	for _, h := range history {
		if h.PE < minPE {
			minPE = h.PE
		}
		if h.PE > maxPE {
			maxPE = h.PE
		}
	}

	// Calculate percentile
	var percentile float64
	if maxPE > minPE {
		percentile = ((currentPE - minPE) / (maxPE - minPE)) * 100
		percentile = math.Max(0, math.Min(100, percentile))
	} else {
		percentile = 50 // All same P/E
	}

	// Map percentile to 1-10 score (1 = cheap, 10 = expensive)
	score := int(math.Ceil(percentile / 10))
	if score < 1 {
		score = 1
	}
	if score > 10 {
		score = 10
	}

	context := &models.HistoricalContext{
		CurrentPE:  currentPE,
		MinPE5Y:    minPE,
		MaxPE5Y:    maxPE,
		Percentile: percentile,
		History:    history,
	}

	return &score, context
}

// calculateSectorScore calculates where current P/E falls among peers.
func (s *Service) calculateSectorScore(currentPE float64, peers []peerRatio) (*int, *models.SectorContext) {
	// Collect valid peer values for each metric
	var peerPEs, peerEVs, peerPSs, peerPBs, peerFCFs, peerPEGs, peerGrowths []float64
	peerVals := make([]models.PeerValuation, 0, len(peers))

	for _, p := range peers {
		peerVals = append(peerVals, models.PeerValuation{
			Ticker:     p.Ticker,
			Name:       p.Name,
			PE:         p.PE,
			EVToEBITDA: p.EVToEBITDA,
			PS:         p.PS,
			PB:         p.PB,
			PriceToFCF: p.PriceToFCF,
			PEG:        p.PEG,
			Growth:     p.Growth,
		})
		if p.PE != nil && *p.PE > 0 {
			peerPEs = append(peerPEs, *p.PE)
		}
		if p.EVToEBITDA != nil && *p.EVToEBITDA > 0 {
			peerEVs = append(peerEVs, *p.EVToEBITDA)
		}
		if p.PS != nil && *p.PS > 0 {
			peerPSs = append(peerPSs, *p.PS)
		}
		if p.PB != nil && *p.PB > 0 {
			peerPBs = append(peerPBs, *p.PB)
		}
		if p.PriceToFCF != nil && *p.PriceToFCF > 0 {
			peerFCFs = append(peerFCFs, *p.PriceToFCF)
		}
		if p.PEG != nil && *p.PEG > 0 {
			peerPEGs = append(peerPEGs, *p.PEG)
		}
		if p.Growth != nil {
			peerGrowths = append(peerGrowths, *p.Growth)
		}
	}

	if len(peerPEs) == 0 {
		return nil, nil
	}

	// Calculate median P/E
	sort.Float64s(peerPEs)
	medianPE := calculateMedianFromSorted(peerPEs)

	// Calculate all medians
	medians := &models.SectorMedians{
		PE: &medianPE,
	}
	if evMedian := calculateMedian(peerEVs); evMedian != nil {
		medians.EVToEBITDA = evMedian
	}
	if psMedian := calculateMedian(peerPSs); psMedian != nil {
		medians.PS = psMedian
	}
	if pbMedian := calculateMedian(peerPBs); pbMedian != nil {
		medians.PB = pbMedian
	}
	if fcfMedian := calculateMedian(peerFCFs); fcfMedian != nil {
		medians.PriceToFCF = fcfMedian
	}
	if pegMedian := calculateMedian(peerPEGs); pegMedian != nil {
		medians.PEG = pegMedian
	}
	if growthMedian := calculateMedian(peerGrowths); growthMedian != nil {
		medians.Growth = growthMedian
	}

	// Calculate percentile rank
	belowCount := 0
	for _, pe := range peerPEs {
		if currentPE > pe {
			belowCount++
		}
	}
	percentile := float64(belowCount) / float64(len(peerPEs)) * 100

	// Map percentile to 1-10 score (1 = cheap vs peers, 10 = expensive)
	score := int(math.Ceil(percentile / 10))
	if score < 1 {
		score = 1
	}
	if score > 10 {
		score = 10
	}

	context := &models.SectorContext{
		PeerMedianPE: medianPE,
		Percentile:   percentile,
		Peers:        peerVals,
		Medians:      medians,
	}

	return &score, context
}

// calculateMedianFromSorted returns the median of a sorted slice.
func calculateMedianFromSorted(values []float64) float64 {
	n := len(values)
	if n == 0 {
		return 0
	}
	if n%2 == 0 {
		return (values[n/2-1] + values[n/2]) / 2
	}
	return values[n/2]
}

// generatePeerInsight creates an auto-generated insight comparing the stock to peers.
// Format: "{TICKER} trades at {X}x sector median EV/EBITDA with {Y}x the growth"
func (s *Service) generatePeerInsight(ticker string, ratios *models.Ratios, ctx *models.SectorContext) string {
	if ctx == nil || ctx.Medians == nil {
		return ""
	}

	// Compare EV/EBITDA to sector median
	var evRatio float64
	var hasEV bool
	if ratios.EVToEBITDA > 0 && ctx.Medians.EVToEBITDA != nil && *ctx.Medians.EVToEBITDA > 0 {
		evRatio = ratios.EVToEBITDA / *ctx.Medians.EVToEBITDA
		hasEV = true
	}

	// Compare growth to sector median
	var growthRatio float64
	var hasGrowth bool
	if ratios.EPSGrowthYoY != 0 && ctx.Medians.Growth != nil && *ctx.Medians.Growth != 0 {
		growthRatio = ratios.EPSGrowthYoY / *ctx.Medians.Growth
		hasGrowth = true
	}

	// Build insight text
	if hasEV && hasGrowth {
		evDesc := formatRatioDescription(evRatio)
		growthDesc := formatGrowthDescription(growthRatio)
		return fmt.Sprintf("%s trades at %s sector median EV/EBITDA %s", ticker, evDesc, growthDesc)
	} else if hasEV {
		evDesc := formatRatioDescription(evRatio)
		return fmt.Sprintf("%s trades at %s sector median EV/EBITDA", ticker, evDesc)
	}

	return ""
}

// formatRatioDescription formats a ratio as "X.Xx" or descriptive text.
func formatRatioDescription(ratio float64) string {
	if ratio < 0.5 {
		return fmt.Sprintf("%.1fx (well below)", ratio)
	} else if ratio < 0.85 {
		return fmt.Sprintf("%.1fx (below)", ratio)
	} else if ratio <= 1.15 {
		return fmt.Sprintf("%.1fx (in line with)", ratio)
	} else if ratio <= 1.5 {
		return fmt.Sprintf("%.1fx (above)", ratio)
	}
	return fmt.Sprintf("%.1fx (well above)", ratio)
}

// formatGrowthDescription formats growth comparison text.
func formatGrowthDescription(growthRatio float64) string {
	if growthRatio <= 0 {
		return "with negative growth"
	} else if growthRatio < 0.5 {
		return fmt.Sprintf("with %.1fx the growth", growthRatio)
	} else if growthRatio < 0.85 {
		return fmt.Sprintf("with %.1fx the growth", growthRatio)
	} else if growthRatio <= 1.15 {
		return "with similar growth"
	} else if growthRatio <= 2.0 {
		return fmt.Sprintf("with %.1fx the growth", growthRatio)
	}
	return fmt.Sprintf("with %.1fx the growth", growthRatio)
}

// calculateGrowthScore maps PEG ratio to 1-10 score.
// Lower PEG = lower score (more undervalued for growth).
func (s *Service) calculateGrowthScore(ratios *models.Ratios) (*int, *models.GrowthContext) {
	peg := ratios.PEG
	if peg <= 0 {
		return nil, nil
	}

	// Map PEG to score:
	// < 0.5 = 1-2, 0.5-1.0 = 2-4, 1.0-1.5 = 4-6, 1.5-2.0 = 6-8, > 2.0 = 8-10
	var score int
	switch {
	case peg < 0.5:
		score = 2
	case peg < 1.0:
		score = 4
	case peg < 1.5:
		score = 6
	case peg < 2.0:
		score = 8
	default:
		score = 10
	}

	context := &models.GrowthContext{
		PEG:       peg,
		ForwardPE: ratios.ForwardPE,
		EPSGrowth: ratios.EPSGrowthYoY,
	}

	return &score, context
}

// generateVerdict creates a verdict text and sentiment based on all scores.
func (s *Service) generateVerdict(data *models.ValuationDeepDive) (string, string) {
	var scores []int
	if data.HistoricalScore != nil {
		scores = append(scores, *data.HistoricalScore)
	}
	if data.SectorScore != nil {
		scores = append(scores, *data.SectorScore)
	}
	if data.GrowthScore != nil {
		scores = append(scores, *data.GrowthScore)
	}

	if len(scores) == 0 {
		return "Insufficient data for valuation verdict", "fair"
	}

	// Calculate average score
	var sum int
	for _, s := range scores {
		sum += s
	}
	avgScore := float64(sum) / float64(len(scores))

	// Determine sentiment
	var sentiment string
	switch {
	case avgScore <= 3.5:
		sentiment = "cheap"
	case avgScore >= 6.5:
		sentiment = "expensive"
	default:
		sentiment = "fair"
	}

	// Generate verdict text
	var verdict string

	// Check for special cases (mixed signals)
	if data.HistoricalScore != nil && data.GrowthScore != nil {
		histScore := *data.HistoricalScore
		growthScore := *data.GrowthScore
		if histScore >= 7 && growthScore <= 4 {
			return "Premium valuation justified by strong growth expectations", "fair"
		}
		if histScore <= 3 && growthScore >= 7 {
			return "Cheap on historical basis but growth outlook is weak", "fair"
		}
	}

	// Default verdicts based on overall score
	switch sentiment {
	case "cheap":
		verdict = "Attractively valued across all measures"
	case "expensive":
		verdict = "Premium valuation — proceed with caution"
	default:
		verdict = "Fairly valued with room for selective opportunity"
	}

	return verdict, sentiment
}
