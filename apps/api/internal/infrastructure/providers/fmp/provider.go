package fmp

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"golang.org/x/sync/errgroup"
)

// ETFHoldingsFallback provides ETF holdings data when FMP returns empty.
// This is used to fall back to EODHD for ETF holdings (FMP requires premium tier).
type ETFHoldingsFallback interface {
	GetETFData(ctx context.Context, ticker string) (*models.ETFData, error)
}

// Provider implements the provider interfaces using FMP API.
type Provider struct {
	client          *Client
	etfHoldingsFallback ETFHoldingsFallback
}

// NewProvider creates a new FMP provider.
func NewProvider(apiKey string) *Provider {
	return &Provider{
		client: NewClient(Config{APIKey: apiKey}),
	}
}

// NewProviderWithFallback creates an FMP provider with an ETF holdings fallback.
// The fallback is used when FMP returns empty holdings (requires premium tier).
func NewProviderWithFallback(apiKey string, fallback ETFHoldingsFallback) *Provider {
	return &Provider{
		client:          NewClient(Config{APIKey: apiKey}),
		etfHoldingsFallback: fallback,
	}
}

// NewProviderWithClient creates a provider with an existing client.
func NewProviderWithClient(client *Client) *Provider {
	return &Provider{client: client}
}

// GetCompany implements FundamentalsProvider.
func (p *Provider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	profile, err := p.client.GetCompanyProfile(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching company profile: %w", err)
	}
	if profile == nil {
		return nil, nil
	}
	return mapCompanyProfile(profile), nil
}

// GetFinancials implements FundamentalsProvider.
func (p *Provider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) {
	income, err := p.client.GetIncomeStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching income statements: %w", err)
	}

	balance, err := p.client.GetBalanceSheet(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching balance sheets: %w", err)
	}

	cashFlow, err := p.client.GetCashFlowStatement(ctx, ticker, periods)
	if err != nil {
		return nil, fmt.Errorf("fetching cash flows: %w", err)
	}

	// Match up statements by period
	minLen := min(len(income), len(balance), len(cashFlow))
	result := make([]models.Financials, 0, minLen)

	for i := 0; i < minLen; i++ {
		f := mapFinancials(&income[i], &balance[i], &cashFlow[i])
		result = append(result, *f)
	}

	return result, nil
}

// GetRatios implements FundamentalsProvider.
func (p *Provider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) {
	var ratios *models.Ratios

	// Try TTM first for most current data
	ratiosTTM, err := p.client.GetRatiosTTM(ctx, ticker)
	if err != nil {
		slog.Debug("FMP TTM ratios fetch failed, falling back to annual", "ticker", ticker, "error", err)
	} else if len(ratiosTTM) == 0 {
		slog.Debug("FMP TTM ratios returned empty array", "ticker", ticker)
	} else {
		metricsTTM, _ := p.client.GetKeyMetricsTTM(ctx, ticker)
		var metrics *KeyMetricsTTM
		if len(metricsTTM) > 0 {
			metrics = &metricsTTM[0]
		}
		ratios = mapRatiosTTM(&ratiosTTM[0], metrics)
	}

	// Fall back to annual ratios if TTM not available
	if ratios == nil {
		annualRatios, err := p.client.GetRatios(ctx, ticker, 1)
		if err != nil {
			return nil, fmt.Errorf("fetching ratios: %w", err)
		}
		if len(annualRatios) == 0 {
			return nil, nil
		}

		metrics, _ := p.client.GetKeyMetrics(ctx, ticker, 1)
		var keyMetrics *KeyMetrics
		if len(metrics) > 0 {
			keyMetrics = &metrics[0]
		}
		ratios = mapRatios(&annualRatios[0], keyMetrics)
	}

	// Fetch pre-calculated growth metrics from FMP financial-growth endpoint
	// This gives us more accurate YoY growth rates than manual calculation
	growth, err := p.client.GetFinancialGrowth(ctx, ticker, 1)
	if err != nil {
		slog.Debug("failed to fetch financial growth", "ticker", ticker, "error", err)
	} else if len(growth) > 0 {
		g := growth[0]
		// FMP returns growth rates as decimals (0.15 = 15%), convert to percentage
		ratios.RevenueGrowthYoY = g.RevenueGrowth * 100
		ratios.EPSGrowthYoY = g.EPSDilutedGrowth * 100
		ratios.CashFlowGrowthYoY = g.FreeCashFlowGrowth * 100
		slog.Debug("FMP financial growth",
			"ticker", ticker,
			"revenueGrowth", ratios.RevenueGrowthYoY,
			"epsGrowth", ratios.EPSGrowthYoY,
			"fcfGrowth", ratios.CashFlowGrowthYoY)
	}

	// Fetch income statements for RevenueTTM and NetIncomeTTM (still needed for other calculations)
	income, err := p.client.GetIncomeStatement(ctx, ticker, 1)
	if err != nil {
		slog.Debug("failed to fetch income statement", "ticker", ticker, "error", err)
	} else if len(income) >= 1 {
		ratios.RevenueTTM = income[0].Revenue
		ratios.NetIncomeTTM = income[0].NetIncome
	}

	// Fetch cash flow statements for FCF TTM value
	cashFlow, err := p.client.GetCashFlowStatement(ctx, ticker, 1)
	if err != nil {
		slog.Debug("failed to fetch cash flow for FCF", "ticker", ticker, "error", err)
	} else if len(cashFlow) >= 1 {
		ratios.FreeCashFlowTTM = cashFlow[0].FreeCashFlow
	}

	return ratios, nil
}

// abs returns the absolute value of a float64.
func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// GetInstitutionalHolders implements FundamentalsProvider.
func (p *Provider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) {
	year, quarter := getMostRecentFilingQuarter()

	// Fetch more holders to calculate top buyers/sellers
	holders, err := p.client.GetInstitutionalHolders(ctx, ticker, year, quarter, 50)
	if err != nil {
		return nil, fmt.Errorf("fetching institutional holders: %w", err)
	}

	if len(holders) == 0 {
		// Try previous quarter
		prevYear, prevQuarter := year, quarter-1
		if prevQuarter == 0 {
			prevQuarter = 4
			prevYear--
		}
		holders, err = p.client.GetInstitutionalHolders(ctx, ticker, prevYear, prevQuarter, 50)
		if err != nil {
			return nil, fmt.Errorf("fetching institutional holders (prev quarter): %w", err)
		}
	}

	result := make([]models.InstitutionalHolder, 0, len(holders))
	for _, h := range holders {
		result = append(result, *mapInstitutionalHolder(&h))
	}

	return result, nil
}

// GetInstitutionalSummary implements FundamentalsProvider.
func (p *Provider) GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error) {
	year, quarter := getMostRecentFilingQuarter()

	summary, err := p.client.GetInstitutionalPositionsSummary(ctx, ticker, year, quarter)
	if err != nil {
		return nil, fmt.Errorf("fetching institutional summary: %w", err)
	}

	if summary == nil {
		// Try previous quarter
		prevYear, prevQuarter := year, quarter-1
		if prevQuarter == 0 {
			prevQuarter = 4
			prevYear--
		}
		summary, err = p.client.GetInstitutionalPositionsSummary(ctx, ticker, prevYear, prevQuarter)
		if err != nil {
			return nil, fmt.Errorf("fetching institutional summary (prev quarter): %w", err)
		}
	}

	if summary == nil {
		return nil, nil
	}

	// Calculate QoQ ownership change
	ownershipChange := 0.0
	if summary.LastOwnershipPercent > 0 {
		ownershipChange = summary.OwnershipPercent - summary.LastOwnershipPercent
	}

	return &models.InstitutionalSummary{
		OwnershipPercent:       summary.OwnershipPercent,
		OwnershipPercentChange: ownershipChange,
		InvestorsHolding:       summary.InvestorsHolding,
		// Note: These need to be calculated from individual holder changes
		// FMP positions-summary doesn't provide increased/decreased/held breakdown
	}, nil
}

// GetInsiderTrades implements FundamentalsProvider.
func (p *Provider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) {
	trades, err := p.client.GetInsiderTrades(ctx, ticker, 50)
	if err != nil {
		return nil, fmt.Errorf("fetching insider trades: %w", err)
	}

	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	result := make([]models.InsiderTrade, 0)

	for _, t := range trades {
		if t.TransactionDate < cutoff {
			continue
		}
		if t.SecuritiesTransacted == 0 {
			continue
		}
		result = append(result, *mapInsiderTrade(&t))
	}

	return result, nil
}

// GetCongressTrades fetches Senate and House trades for a ticker.
func (p *Provider) GetCongressTrades(ctx context.Context, ticker string, days int) ([]models.CongressTrade, error) {
	var senateTrades []SenateTrade
	var houseTrades []HouseTrade

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		senateTrades, err = p.client.GetSenateTrades(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch senate trades", "ticker", ticker, "error", err)
		}
		return nil // Don't fail on error, just log
	})

	g.Go(func() error {
		var err error
		houseTrades, err = p.client.GetHouseTrades(gctx, ticker)
		if err != nil {
			slog.Warn("failed to fetch house trades", "ticker", ticker, "error", err)
		}
		return nil // Don't fail on error, just log
	})

	_ = g.Wait()

	cutoff := time.Now().AddDate(0, 0, -days)
	result := make([]models.CongressTrade, 0, len(senateTrades)+len(houseTrades))

	// Map Senate trades
	for _, t := range senateTrades {
		trade := mapSenateTrade(&t)
		if trade != nil && trade.TransactionDate.After(cutoff) {
			result = append(result, *trade)
		}
	}

	// Map House trades
	for _, t := range houseTrades {
		trade := mapHouseTrade(&t)
		if trade != nil && trade.TransactionDate.After(cutoff) {
			result = append(result, *trade)
		}
	}

	return result, nil
}

// GetQuote implements QuoteProvider.
func (p *Provider) GetQuote(ctx context.Context, ticker string) (*models.Quote, error) {
	quote, err := p.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote: %w", err)
	}
	if quote == nil {
		return nil, nil
	}
	return mapQuote(quote), nil
}

// GetHistoricalPrices implements QuoteProvider.
func (p *Provider) GetHistoricalPrices(ctx context.Context, ticker string, days int) ([]models.PriceBar, error) {
	fromDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	prices, err := p.client.GetHistoricalPrices(ctx, ticker, fromDate)
	if err != nil {
		return nil, fmt.Errorf("fetching historical prices: %w", err)
	}

	result := make([]models.PriceBar, 0, len(prices))
	for _, pr := range prices {
		result = append(result, *mapHistoricalPrice(&pr))
	}

	// Sort by date descending (newest first) to ensure consistent ordering
	// The calculatePerformance function expects prices[0] to be most recent
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date.After(result[j].Date)
	})

	return result, nil
}

// GetDCF implements FundamentalsProvider.
func (p *Provider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) {
	dcf, err := p.client.GetDCF(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching DCF: %w", err)
	}
	if dcf == nil {
		return nil, nil
	}
	return &models.DCF{
		Ticker:     dcf.Symbol,
		DCFValue:   dcf.DCF,
		StockPrice: dcf.StockPrice,
	}, nil
}

// GetOwnerEarnings implements FundamentalsProvider.
func (p *Provider) GetOwnerEarnings(ctx context.Context, ticker string) (*models.OwnerEarnings, error) {
	data, err := p.client.GetOwnerEarnings(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching owner earnings: %w", err)
	}
	if data == nil {
		return nil, nil
	}
	return &models.OwnerEarnings{
		Ticker:                data.Symbol,
		OwnerEarnings:         data.OwnersEarnings,        // API uses "owners" with 's'
		OwnerEarningsPerShare: data.OwnersEarningsPerShare, // API uses "owners" with 's'
		GrowthCapex:           data.GrowthCapex,
		MaintenanceCapex:      data.MaintenanceCapex,
	}, nil
}

// Search implements SearchProvider.
func (p *Provider) Search(ctx context.Context, query string, limit int) ([]models.SearchResult, error) {
	results, err := p.client.SearchTicker(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching tickers: %w", err)
	}

	mapped := make([]models.SearchResult, 0, len(results))
	for _, r := range results {
		mapped = append(mapped, *mapSearchResult(&r))
	}

	return mapped, nil
}

// GetIndustryAverages implements FundamentalsProvider.
// Note: FMP has limited industry average data. This implementation returns nil
// when data is not available. Future enhancement: compute from sector peers.
func (p *Provider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) {
	// FMP doesn't have a direct industry averages endpoint.
	// Future implementation options:
	// 1. Use FMP's sector PE ratio endpoint for basic valuation data
	// 2. Fetch peer companies and compute averages manually
	// 3. Integrate with a different data source that provides industry benchmarks
	return nil, nil
}

// GetTechnicalMetrics implements FundamentalsProvider.
// Extracts technical metrics from Quote (MA50, MA200) and CompanyProfile (Beta).
func (p *Provider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) {
	// Get quote for moving averages
	quote, err := p.client.GetQuote(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching quote for technical metrics: %w", err)
	}
	if quote == nil {
		return nil, nil
	}

	// Get company profile for beta
	profile, err := p.client.GetCompanyProfile(ctx, ticker)
	if err != nil {
		slog.Warn("failed to fetch profile for beta", "ticker", ticker, "error", err)
	}

	beta := 0.0
	if profile != nil {
		beta = profile.Beta
	}

	return &models.TechnicalMetrics{
		Ticker:   ticker,
		Beta:     beta,
		MA50Day:  quote.PriceAvg50,
		MA200Day: quote.PriceAvg200,
	}, nil
}

// GetShortInterest implements FundamentalsProvider.
// Note: FMP doesn't provide short interest data. Returns nil.
func (p *Provider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) {
	// FMP doesn't have short interest data in the free tier.
	return nil, nil
}

// IsETF implements FundamentalsProvider.
// Checks if the ticker is an ETF by attempting to fetch ETF info.
func (p *Provider) IsETF(ctx context.Context, ticker string) (bool, error) {
	info, err := p.client.GetETFInfo(ctx, ticker)
	if err != nil {
		// Not an error - just means it's likely not an ETF or API issue
		slog.Debug("ETF info check failed", "ticker", ticker, "error", err)
		return false, nil
	}
	return info != nil && info.Symbol != "", nil
}

// GetETFData implements FundamentalsProvider.
// Fetches ETF info, holdings, sector weightings, country weightings, key metrics, and profile from FMP.
func (p *Provider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) {
	var info *ETFInfo
	var holdings []ETFHolding
	var sectors []ETFSectorWeighting
	var countries []ETFCountryWeighting
	var profile *CompanyProfile
	var keyMetrics *KeyMetricsTTM

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		info, err = p.client.GetETFInfo(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF info", "ticker", ticker, "error", err)
		}
		return nil // Don't fail the group on individual errors
	})

	g.Go(func() error {
		var err error
		holdings, err = p.client.GetETFHoldings(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF holdings", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		sectors, err = p.client.GetETFSectorWeightings(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF sector weightings", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		countries, err = p.client.GetETFCountryWeightings(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF country weightings", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		profile, err = p.client.GetCompanyProfile(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF profile for beta", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		metrics, err := p.client.GetKeyMetricsTTM(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch ETF key metrics TTM", "ticker", ticker, "error", err)
		} else if len(metrics) > 0 {
			keyMetrics = &metrics[0]
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching ETF data: %w", err)
	}

	// If no ETF info, this isn't an ETF
	if info == nil {
		return nil, nil
	}

	// Build base ETF data from FMP
	etfData := mapETFData(info, holdings, sectors, countries, profile, keyMetrics)

	// If FMP returned empty holdings and we have a fallback, use it
	if len(holdings) == 0 && p.etfHoldingsFallback != nil {
		slog.Info("FMP ETF holdings empty, using fallback provider", "ticker", ticker)
		fallbackData, err := p.etfHoldingsFallback.GetETFData(ctx, ticker)
		if err != nil {
			slog.Warn("ETF holdings fallback failed", "ticker", ticker, "error", err)
		} else if fallbackData != nil {
			// Merge fallback holdings into FMP data
			etfData.Holdings = fallbackData.Holdings
			etfData.HoldingsCount = fallbackData.HoldingsCount
			// Also use fallback sector weights if FMP returned empty
			if len(sectors) == 0 && len(fallbackData.SectorWeights) > 0 {
				etfData.SectorWeights = fallbackData.SectorWeights
			}
			// Use fallback regions and market cap breakdown if available
			if len(etfData.Regions) == 0 && len(fallbackData.Regions) > 0 {
				etfData.Regions = fallbackData.Regions
			}
			if etfData.MarketCapBreakdown == nil && fallbackData.MarketCapBreakdown != nil {
				etfData.MarketCapBreakdown = fallbackData.MarketCapBreakdown
			}
			if etfData.Valuations == nil && fallbackData.Valuations != nil {
				etfData.Valuations = fallbackData.Valuations
			}
			if etfData.Performance == nil && fallbackData.Performance != nil {
				etfData.Performance = fallbackData.Performance
			}
			slog.Info("ETF holdings merged from fallback",
				"ticker", ticker,
				"holdingsCount", len(etfData.Holdings),
				"sectorWeightsCount", len(etfData.SectorWeights),
			)
		}
	}

	return etfData, nil
}

// GetAnalystEstimates implements FundamentalsProvider.
// Fetches analyst ratings, price targets, and EPS/revenue estimates from FMP.
func (p *Provider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) {
	var grades *GradesConsensus
	var targets *PriceTargetConsensus
	var estimates []AnalystEstimate

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		grades, err = p.client.GetGradesConsensus(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch grades consensus", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		targets, err = p.client.GetPriceTargetConsensus(gctx, ticker)
		if err != nil {
			slog.Debug("failed to fetch price targets", "ticker", ticker, "error", err)
		}
		return nil
	})

	g.Go(func() error {
		var err error
		estimates, err = p.client.GetAnalystEstimates(gctx, ticker, "annual", 4)
		if err != nil {
			slog.Debug("failed to fetch analyst estimates", "ticker", ticker, "error", err)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching analyst estimates: %w", err)
	}

	// Log what we got for debugging
	slog.Info("FMP analyst data fetched",
		"ticker", ticker,
		"hasGrades", grades != nil,
		"hasTargets", targets != nil,
		"estimatesCount", len(estimates),
	)
	if grades != nil {
		slog.Debug("FMP grades consensus",
			"ticker", ticker,
			"strongBuy", grades.StrongBuy,
			"buy", grades.Buy,
			"hold", grades.Hold,
			"sell", grades.Sell,
			"strongSell", grades.StrongSell,
			"consensus", grades.Consensus,
		)
	}
	// Log estimate details for debugging NTM P/S issues
	for i, est := range estimates {
		slog.Debug("FMP analyst estimate",
			"ticker", ticker,
			"index", i,
			"date", est.Date,
			"revenueAvg", est.RevenueAvg,
			"epsAvg", est.EPSAvg,
		)
	}

	// If no data at all, return nil
	if grades == nil && targets == nil && len(estimates) == 0 {
		return nil, nil
	}

	return mapAnalystEstimates(ticker, grades, targets, estimates), nil
}

// GetStockPeers implements FundamentalsProvider.
// Returns a list of peer/competitor ticker symbols.
func (p *Provider) GetStockPeers(ctx context.Context, ticker string) ([]string, error) {
	peers, err := p.client.GetStockPeers(ctx, ticker)
	if err != nil {
		return nil, fmt.Errorf("fetching stock peers: %w", err)
	}
	return peers, nil
}

// GetQuarterlyRatios implements FundamentalsProvider.
// Returns quarterly valuation ratios for historical analysis.
func (p *Provider) GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error) {
	ratios, err := p.client.GetQuarterlyRatios(ctx, ticker, quarters)
	if err != nil {
		return nil, fmt.Errorf("fetching quarterly ratios: %w", err)
	}

	result := make([]models.QuarterlyRatio, 0, len(ratios))
	for _, r := range ratios {
		// Skip entries with no P/E (negative earnings)
		if r.PriceToEarningsRatio <= 0 {
			continue
		}
		result = append(result, models.QuarterlyRatio{
			Date:       r.Date,
			PE:         r.PriceToEarningsRatio,
			PS:         r.PriceToSalesRatio,
			PB:         r.PriceToBookRatio,
			PriceToFCF: r.PriceToFreeCashFlowRatio,
			EVToEBITDA: r.EnterpriseValueMultiple,
			PEG:        r.PriceToEarningsGrowthRatio,
		})
	}

	return result, nil
}

// GetSectorPE implements FundamentalsProvider.
// Returns sector P/E ratio for the given sector and exchange.
func (p *Provider) GetSectorPE(ctx context.Context, sector string, exchange string) (*models.SectorPE, error) {
	sectorPE, err := p.client.GetSectorPE(ctx, sector, exchange)
	if err != nil {
		return nil, fmt.Errorf("fetching sector P/E: %w", err)
	}
	if sectorPE == nil {
		return nil, nil
	}
	return &models.SectorPE{
		Date:     sectorPE.Date,
		Sector:   sectorPE.Sector,
		Exchange: sectorPE.Exchange,
		PE:       sectorPE.PE,
	}, nil
}

// GetIndustryPE implements FundamentalsProvider.
// Returns industry P/E ratio (more granular than sector).
func (p *Provider) GetIndustryPE(ctx context.Context, industry string, exchange string) (*models.IndustryPE, error) {
	industryPE, err := p.client.GetIndustryPE(ctx, industry, exchange)
	if err != nil {
		return nil, fmt.Errorf("fetching industry P/E: %w", err)
	}
	if industryPE == nil {
		return nil, nil
	}
	return &models.IndustryPE{
		Date:     industryPE.Date,
		Industry: industryPE.Industry,
		Exchange: industryPE.Exchange,
		PE:       industryPE.PE,
	}, nil
}

// GetNews implements FundamentalsProvider.
// Returns recent news articles for the given ticker.
func (p *Provider) GetNews(ctx context.Context, ticker string, limit int) ([]models.NewsArticle, error) {
	articles, err := p.client.GetNews(ctx, ticker, limit)
	if err != nil {
		return nil, fmt.Errorf("fetching news: %w", err)
	}

	result := make([]models.NewsArticle, 0, len(articles))
	for i := range articles {
		mapped := mapNewsArticle(&articles[i])
		result = append(result, *mapped)
	}

	return result, nil
}

// getMostRecentFilingQuarter returns the most recent quarter with complete 13F filings.
func getMostRecentFilingQuarter() (year int, quarter int) {
	now := time.Now()
	filingDeadline := now.AddDate(0, 0, -45)

	year = filingDeadline.Year()
	month := int(filingDeadline.Month())

	switch {
	case month >= 10:
		quarter = 3
	case month >= 7:
		quarter = 2
	case month >= 4:
		quarter = 1
	default:
		quarter = 4
		year--
	}

	return year, quarter
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
