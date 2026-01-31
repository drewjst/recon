package handlers

import (
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/drewjst/crux/apps/api/internal/api/middleware"
	"github.com/drewjst/crux/apps/api/internal/domain/repository"
)

const (
	defaultPeriodLimit = 5
	maxPeriodLimit     = 20
)

// FinancialsHandler handles financial statement HTTP requests.
type FinancialsHandler struct {
	repo repository.FinancialsRepository
}

// NewFinancialsHandler creates a new financials handler.
func NewFinancialsHandler(repo repository.FinancialsRepository) *FinancialsHandler {
	return &FinancialsHandler{repo: repo}
}

// =============================================================================
// Response Types
// =============================================================================

// IncomeStatementResponse is the API response for income statements.
type IncomeStatementResponse struct {
	Ticker     string                  `json:"ticker"`
	Currency   string                  `json:"currency"`
	PeriodType string                  `json:"periodType"`
	Periods    []IncomeStatementPeriod `json:"periods"`
}

// IncomeStatementPeriod represents a single income statement period.
type IncomeStatementPeriod struct {
	PeriodEnd     string `json:"periodEnd"`
	FiscalYear    int    `json:"fiscalYear"`
	FiscalQuarter *int   `json:"fiscalQuarter"`
	FilingDate    string `json:"filingDate,omitempty"`

	// Revenue
	Revenue          int64   `json:"revenue"`
	RevenueFormatted string  `json:"revenueFormatted"`
	CostOfRevenue    int64   `json:"costOfRevenue"`
	GrossProfit      int64   `json:"grossProfit"`
	GrossMargin      float64 `json:"grossMargin"`

	// Operating Expenses Breakdown
	ResearchAndDevelopment int64 `json:"researchAndDevelopment"`
	SellingGeneralAdmin    int64 `json:"sellingGeneralAdmin"`
	OperatingExpenses      int64 `json:"operatingExpenses"`

	// Operating Income
	OperatingIncome int64   `json:"operatingIncome"`
	OperatingMargin float64 `json:"operatingMargin"`

	// Non-Operating
	InterestIncome   int64 `json:"interestIncome"`
	InterestExpense  int64 `json:"interestExpense"`
	IncomeBeforeTax  int64 `json:"incomeBeforeTax"`
	IncomeTaxExpense int64 `json:"incomeTaxExpense"`

	// Net Income
	NetIncome          int64   `json:"netIncome"`
	NetIncomeFormatted string  `json:"netIncomeFormatted"`
	NetMargin          float64 `json:"netMargin"`

	// Per Share
	EPSBasic   float64 `json:"epsBasic"`
	EPSDiluted float64 `json:"epsDiluted"`

	// Shares Outstanding
	SharesOutstandingBasic   int64 `json:"sharesOutstandingBasic"`
	SharesOutstandingDiluted int64 `json:"sharesOutstandingDiluted"`

	// Other
	EBITDA       int64   `json:"ebitda"`
	EBITDAMargin float64 `json:"ebitdaMargin"`

	// Effective Tax Rate
	EffectiveTaxRate float64 `json:"effectiveTaxRate"`

	// YoY Growth (computed)
	RevenueGrowth         *float64 `json:"revenueGrowth,omitempty"`
	GrossProfitGrowth     *float64 `json:"grossProfitGrowth,omitempty"`
	OperatingIncomeGrowth *float64 `json:"operatingIncomeGrowth,omitempty"`
	NetIncomeGrowth       *float64 `json:"netIncomeGrowth,omitempty"`
	EPSGrowth             *float64 `json:"epsGrowth,omitempty"`
}

// BalanceSheetResponse is the API response for balance sheets.
type BalanceSheetResponse struct {
	Ticker     string               `json:"ticker"`
	Currency   string               `json:"currency"`
	PeriodType string               `json:"periodType"`
	Periods    []BalanceSheetPeriod `json:"periods"`
}

// BalanceSheetPeriod represents a single balance sheet period.
type BalanceSheetPeriod struct {
	PeriodEnd     string `json:"periodEnd"`
	FiscalYear    int    `json:"fiscalYear"`
	FiscalQuarter *int   `json:"fiscalQuarter"`
	FilingDate    string `json:"filingDate,omitempty"`

	// Current Assets
	CashAndEquivalents int64 `json:"cashAndEquivalents"`
	AccountsReceivable int64 `json:"accountsReceivable"`
	Inventory          int64 `json:"inventory"`
	TotalCurrentAssets int64 `json:"totalCurrentAssets"`

	// Non-Current Assets
	TotalNonCurrentAssets int64 `json:"totalNonCurrentAssets"`

	// Total Assets
	TotalAssets          int64  `json:"totalAssets"`
	TotalAssetsFormatted string `json:"totalAssetsFormatted"`

	// Current Liabilities
	AccountsPayable         int64 `json:"accountsPayable"`
	ShortTermDebt           int64 `json:"shortTermDebt"`
	TotalCurrentLiabilities int64 `json:"totalCurrentLiabilities"`

	// Non-Current Liabilities
	LongTermDebt        int64 `json:"longTermDebt"`
	TotalNonCurrentLiab int64 `json:"totalNonCurrentLiabilities"`

	// Total Liabilities
	TotalLiabilities   int64  `json:"totalLiabilities"`
	TotalLiabFormatted string `json:"totalLiabilitiesFormatted"`

	// Debt Summary
	TotalDebt int64 `json:"totalDebt"`
	NetDebt   int64 `json:"netDebt"`

	// Equity
	CommonStock      int64 `json:"commonStock"`
	RetainedEarnings int64 `json:"retainedEarnings"`
	TotalEquity      int64 `json:"totalEquity"`
	TotalEquityFormatted string `json:"totalEquityFormatted"`

	// Computed Metrics
	WorkingCapital int64 `json:"workingCapital"`

	// Ratios
	CurrentRatio float64 `json:"currentRatio"`
	QuickRatio   float64 `json:"quickRatio"`
	DebtToEquity float64 `json:"debtToEquity"`
	DebtToAssets float64 `json:"debtToAssets"`

	// YoY Growth
	TotalAssetsGrowth      *float64 `json:"totalAssetsGrowth,omitempty"`
	TotalLiabilitiesGrowth *float64 `json:"totalLiabilitiesGrowth,omitempty"`
	TotalEquityGrowth      *float64 `json:"totalEquityGrowth,omitempty"`
}

// CashFlowResponse is the API response for cash flow statements.
type CashFlowResponse struct {
	Ticker     string           `json:"ticker"`
	Currency   string           `json:"currency"`
	PeriodType string           `json:"periodType"`
	Periods    []CashFlowPeriod `json:"periods"`
}

// CashFlowPeriod represents a single cash flow statement period.
type CashFlowPeriod struct {
	PeriodEnd     string `json:"periodEnd"`
	FiscalYear    int    `json:"fiscalYear"`
	FiscalQuarter *int   `json:"fiscalQuarter"`
	FilingDate    string `json:"filingDate,omitempty"`

	// Operating Activities
	NetIncome                int64  `json:"netIncome"`
	DepreciationAmortization int64  `json:"depreciationAmortization"`
	StockBasedCompensation   int64  `json:"stockBasedCompensation"`
	ChangeInWorkingCapital   int64  `json:"changeInWorkingCapital"`
	OperatingCashFlow        int64  `json:"operatingCashFlow"`
	OperatingCashFlowFormatted string `json:"operatingCashFlowFormatted"`

	// Investing Activities
	CapitalExpenditures int64 `json:"capitalExpenditures"`
	Acquisitions        int64 `json:"acquisitions"`
	InvestingCashFlow   int64 `json:"investingCashFlow"`

	// Financing Activities
	DebtRepayment          int64 `json:"debtRepayment"`
	DebtIssuance           int64 `json:"debtIssuance"`
	CommonStockRepurchased int64 `json:"stockBuybacks"`
	DividendsPaid          int64 `json:"dividendsPaid"`
	FinancingCashFlow      int64 `json:"financingCashFlow"`

	// Summary
	NetChangeInCash       int64  `json:"netChangeInCash"`
	FreeCashFlow          int64  `json:"freeCashFlow"`
	FreeCashFlowFormatted string `json:"freeCashFlowFormatted"`

	// FCF Conversion (Operating CF to FCF ratio)
	FCFConversion float64 `json:"fcfConversion"`

	// YoY Growth
	OperatingCFGrowth  *float64 `json:"operatingCashFlowGrowth,omitempty"`
	FreeCashFlowGrowth *float64 `json:"freeCashFlowGrowth,omitempty"`
	CapexGrowth        *float64 `json:"capexGrowth,omitempty"`
}

// SegmentsResponse is the API response for revenue segments.
type SegmentsResponse struct {
	Ticker     string          `json:"ticker"`
	Currency   string          `json:"currency"`
	PeriodType string          `json:"periodType"`
	Periods    []SegmentPeriod `json:"periods"`
}

// SegmentPeriod represents segments for a single period.
type SegmentPeriod struct {
	PeriodEnd string           `json:"periodEnd"`
	Segments  []RevenueSegment `json:"segments"`
}

// RevenueSegment represents a single revenue segment.
type RevenueSegment struct {
	Type       string  `json:"type"` // "product" or "geography"
	Name       string  `json:"name"`
	Revenue    int64   `json:"revenue"`
	Percentage float64 `json:"percentage"`
}

// =============================================================================
// Handlers
// =============================================================================

// GetIncomeStatements handles GET /api/stock/{ticker}/financials/income
func (h *FinancialsHandler) GetIncomeStatements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := middleware.GetRequestID(ctx)

	ticker := strings.ToUpper(chi.URLParam(r, "ticker"))
	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format", map[string]string{"ticker": ticker})
		return
	}

	periodType, limit := parseFinancialsParams(r)

	statements, err := h.repo.GetIncomeStatements(ctx, ticker, periodType, limit)
	if err != nil {
		slog.Error("failed to get income statements",
			"error", err, "ticker", ticker, "request_id", requestID)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to retrieve income statements")
		return
	}

	response := IncomeStatementResponse{
		Ticker:     ticker,
		Currency:   "USD",
		PeriodType: string(periodType),
		Periods:    make([]IncomeStatementPeriod, len(statements)),
	}

	for i, stmt := range statements {
		period := IncomeStatementPeriod{
			PeriodEnd:     stmt.PeriodEnd.Format("2006-01-02"),
			FiscalYear:    stmt.FiscalYear,
			FiscalQuarter: stmt.FiscalQuarter,

			// Revenue
			Revenue:          stmt.Revenue,
			RevenueFormatted: formatLargeNumber(stmt.Revenue),
			CostOfRevenue:    stmt.CostOfRevenue,
			GrossProfit:      stmt.GrossProfit,
			GrossMargin:      safePercent(stmt.GrossProfit, stmt.Revenue),

			// Operating Expenses Breakdown
			ResearchAndDevelopment: stmt.ResearchAndDevelopment,
			SellingGeneralAdmin:    stmt.SellingGeneralAdmin,
			OperatingExpenses:      stmt.OperatingExpenses,

			// Operating Income
			OperatingIncome: stmt.OperatingIncome,
			OperatingMargin: safePercent(stmt.OperatingIncome, stmt.Revenue),

			// Non-Operating
			InterestIncome:   stmt.InterestIncome,
			InterestExpense:  stmt.InterestExpense,
			IncomeBeforeTax:  stmt.IncomeBeforeTax,
			IncomeTaxExpense: stmt.IncomeTaxExpense,

			// Net Income
			NetIncome:          stmt.NetIncome,
			NetIncomeFormatted: formatLargeNumber(stmt.NetIncome),
			NetMargin:          safePercent(stmt.NetIncome, stmt.Revenue),

			// Per Share
			EPSBasic:   stmt.EPSBasic,
			EPSDiluted: stmt.EPSDiluted,

			// Shares Outstanding
			SharesOutstandingBasic:   stmt.WeightedAvgSharesBasic,
			SharesOutstandingDiluted: stmt.WeightedAvgSharesDiluted,

			// Other
			EBITDA:       stmt.EBITDA,
			EBITDAMargin: safePercent(stmt.EBITDA, stmt.Revenue),

			// Effective Tax Rate
			EffectiveTaxRate: safePercent(stmt.IncomeTaxExpense, stmt.IncomeBeforeTax),
		}

		if stmt.FilingDate != nil {
			period.FilingDate = stmt.FilingDate.Format("2006-01-02")
		}

		// Compute YoY growth by comparing to next period in slice (which is previous chronologically)
		if i < len(statements)-1 {
			prev := statements[i+1]
			period.RevenueGrowth = computeGrowth(stmt.Revenue, prev.Revenue)
			period.GrossProfitGrowth = computeGrowth(stmt.GrossProfit, prev.GrossProfit)
			period.OperatingIncomeGrowth = computeGrowth(stmt.OperatingIncome, prev.OperatingIncome)
			period.NetIncomeGrowth = computeGrowth(stmt.NetIncome, prev.NetIncome)
			period.EPSGrowth = computeGrowthFloat(stmt.EPSDiluted, prev.EPSDiluted)
		}

		response.Periods[i] = period
	}

	writeJSON(w, http.StatusOK, response)
}

// GetBalanceSheets handles GET /api/stock/{ticker}/financials/balance-sheet
func (h *FinancialsHandler) GetBalanceSheets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := middleware.GetRequestID(ctx)

	ticker := strings.ToUpper(chi.URLParam(r, "ticker"))
	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format", map[string]string{"ticker": ticker})
		return
	}

	periodType, limit := parseFinancialsParams(r)

	sheets, err := h.repo.GetBalanceSheets(ctx, ticker, periodType, limit)
	if err != nil {
		slog.Error("failed to get balance sheets",
			"error", err, "ticker", ticker, "request_id", requestID)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to retrieve balance sheets")
		return
	}

	response := BalanceSheetResponse{
		Ticker:     ticker,
		Currency:   "USD",
		PeriodType: string(periodType),
		Periods:    make([]BalanceSheetPeriod, len(sheets)),
	}

	for i, sheet := range sheets {
		// Calculate working capital
		workingCapital := sheet.TotalCurrentAssets - sheet.TotalCurrentLiabilities

		// Calculate quick ratio: (Current Assets - Inventory) / Current Liabilities
		quickAssets := sheet.TotalCurrentAssets - sheet.Inventory
		quickRatio := safeRatio(float64(quickAssets), float64(sheet.TotalCurrentLiabilities))

		period := BalanceSheetPeriod{
			PeriodEnd:     sheet.PeriodEnd.Format("2006-01-02"),
			FiscalYear:    sheet.FiscalYear,
			FiscalQuarter: sheet.FiscalQuarter,

			// Current Assets
			CashAndEquivalents: sheet.CashAndEquivalents,
			AccountsReceivable: sheet.AccountsReceivable,
			Inventory:          sheet.Inventory,
			TotalCurrentAssets: sheet.TotalCurrentAssets,

			// Non-Current Assets
			TotalNonCurrentAssets: sheet.TotalNonCurrentAssets,

			// Total Assets
			TotalAssets:          sheet.TotalAssets,
			TotalAssetsFormatted: formatLargeNumber(sheet.TotalAssets),

			// Current Liabilities
			AccountsPayable:         sheet.AccountsPayable,
			ShortTermDebt:           sheet.ShortTermDebt,
			TotalCurrentLiabilities: sheet.TotalCurrentLiabilities,

			// Non-Current Liabilities
			LongTermDebt:        sheet.LongTermDebt,
			TotalNonCurrentLiab: sheet.TotalNonCurrentLiab,

			// Total Liabilities
			TotalLiabilities:   sheet.TotalLiabilities,
			TotalLiabFormatted: formatLargeNumber(sheet.TotalLiabilities),

			// Debt Summary
			TotalDebt: sheet.TotalDebt,
			NetDebt:   sheet.NetDebt,

			// Equity
			CommonStock:          sheet.CommonStock,
			RetainedEarnings:     sheet.RetainedEarnings,
			TotalEquity:          sheet.TotalEquity,
			TotalEquityFormatted: formatLargeNumber(sheet.TotalEquity),

			// Computed Metrics
			WorkingCapital: workingCapital,

			// Ratios
			CurrentRatio: safeRatio(float64(sheet.TotalCurrentAssets), float64(sheet.TotalCurrentLiabilities)),
			QuickRatio:   quickRatio,
			DebtToEquity: safeRatio(float64(sheet.TotalDebt), float64(sheet.TotalEquity)),
			DebtToAssets: safeRatio(float64(sheet.TotalDebt), float64(sheet.TotalAssets)),
		}

		if sheet.FilingDate != nil {
			period.FilingDate = sheet.FilingDate.Format("2006-01-02")
		}

		// Compute YoY growth
		if i < len(sheets)-1 {
			prev := sheets[i+1]
			period.TotalAssetsGrowth = computeGrowth(sheet.TotalAssets, prev.TotalAssets)
			period.TotalLiabilitiesGrowth = computeGrowth(sheet.TotalLiabilities, prev.TotalLiabilities)
			period.TotalEquityGrowth = computeGrowth(sheet.TotalEquity, prev.TotalEquity)
		}

		response.Periods[i] = period
	}

	writeJSON(w, http.StatusOK, response)
}

// GetCashFlowStatements handles GET /api/stock/{ticker}/financials/cash-flow
func (h *FinancialsHandler) GetCashFlowStatements(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := middleware.GetRequestID(ctx)

	ticker := strings.ToUpper(chi.URLParam(r, "ticker"))
	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format", map[string]string{"ticker": ticker})
		return
	}

	periodType, limit := parseFinancialsParams(r)

	statements, err := h.repo.GetCashFlowStatements(ctx, ticker, periodType, limit)
	if err != nil {
		slog.Error("failed to get cash flow statements",
			"error", err, "ticker", ticker, "request_id", requestID)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to retrieve cash flow statements")
		return
	}

	response := CashFlowResponse{
		Ticker:     ticker,
		Currency:   "USD",
		PeriodType: string(periodType),
		Periods:    make([]CashFlowPeriod, len(statements)),
	}

	for i, stmt := range statements {
		// Calculate FCF Conversion (FCF / Operating CF)
		fcfConversion := safePercent(stmt.FreeCashFlow, stmt.OperatingCashFlow)

		// Calculate net change in cash
		netChange := stmt.OperatingCashFlow + stmt.InvestingCashFlow + stmt.FinancingCashFlow

		period := CashFlowPeriod{
			PeriodEnd:     stmt.PeriodEnd.Format("2006-01-02"),
			FiscalYear:    stmt.FiscalYear,
			FiscalQuarter: stmt.FiscalQuarter,

			// Operating Activities
			NetIncome:                stmt.NetIncome,
			DepreciationAmortization: stmt.DepreciationAmortization,
			StockBasedCompensation:   stmt.StockBasedCompensation,
			ChangeInWorkingCapital:   stmt.ChangeInWorkingCapital,
			OperatingCashFlow:        stmt.OperatingCashFlow,
			OperatingCashFlowFormatted: formatLargeNumber(stmt.OperatingCashFlow),

			// Investing Activities
			CapitalExpenditures: stmt.CapitalExpenditures,
			Acquisitions:        stmt.Acquisitions,
			InvestingCashFlow:   stmt.InvestingCashFlow,

			// Financing Activities
			DebtRepayment:          stmt.DebtRepayment,
			DebtIssuance:           stmt.DebtIssuance,
			CommonStockRepurchased: stmt.CommonStockRepurchased,
			DividendsPaid:          stmt.DividendsPaid,
			FinancingCashFlow:      stmt.FinancingCashFlow,

			// Summary
			NetChangeInCash:       netChange,
			FreeCashFlow:          stmt.FreeCashFlow,
			FreeCashFlowFormatted: formatLargeNumber(stmt.FreeCashFlow),

			// FCF Conversion
			FCFConversion: fcfConversion,
		}

		if stmt.FilingDate != nil {
			period.FilingDate = stmt.FilingDate.Format("2006-01-02")
		}

		// Compute YoY growth
		if i < len(statements)-1 {
			prev := statements[i+1]
			period.OperatingCFGrowth = computeGrowth(stmt.OperatingCashFlow, prev.OperatingCashFlow)
			period.FreeCashFlowGrowth = computeGrowth(stmt.FreeCashFlow, prev.FreeCashFlow)
			period.CapexGrowth = computeGrowth(stmt.CapitalExpenditures, prev.CapitalExpenditures)
		}

		response.Periods[i] = period
	}

	writeJSON(w, http.StatusOK, response)
}

// GetRevenueSegments handles GET /api/stock/{ticker}/financials/segments
func (h *FinancialsHandler) GetRevenueSegments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := middleware.GetRequestID(ctx)

	ticker := strings.ToUpper(chi.URLParam(r, "ticker"))
	if !isValidTicker(ticker) {
		writeErrorWithDetails(w, http.StatusBadRequest, ErrCodeInvalidTicker,
			"Invalid ticker format", map[string]string{"ticker": ticker})
		return
	}

	periodType, limit := parseFinancialsParams(r)

	segments, err := h.repo.GetRevenueSegments(ctx, ticker, periodType, limit)
	if err != nil {
		slog.Error("failed to get revenue segments",
			"error", err, "ticker", ticker, "request_id", requestID)
		writeError(w, http.StatusInternalServerError, ErrCodeInternalError,
			"Failed to retrieve revenue segments")
		return
	}

	// Group segments by period
	periodMap := make(map[string][]RevenueSegment)
	for _, seg := range segments {
		key := seg.PeriodEnd.Format("2006-01-02")
		periodMap[key] = append(periodMap[key], RevenueSegment{
			Type:       seg.SegmentType,
			Name:       seg.SegmentName,
			Revenue:    seg.Revenue,
			Percentage: seg.Percentage,
		})
	}

	// Convert to response format
	var periods []SegmentPeriod
	for periodEnd, segs := range periodMap {
		periods = append(periods, SegmentPeriod{
			PeriodEnd: periodEnd,
			Segments:  segs,
		})
	}

	response := SegmentsResponse{
		Ticker:     ticker,
		Currency:   "USD",
		PeriodType: string(periodType),
		Periods:    periods,
	}

	writeJSON(w, http.StatusOK, response)
}

// =============================================================================
// Helper Functions
// =============================================================================

// parseFinancialsParams extracts period type and limit from query params.
func parseFinancialsParams(r *http.Request) (repository.PeriodType, int) {
	periodStr := r.URL.Query().Get("period")
	var periodType repository.PeriodType
	switch periodStr {
	case "quarterly":
		periodType = repository.PeriodTypeQuarterly
	case "ttm":
		periodType = repository.PeriodTypeTTM
	default:
		periodType = repository.PeriodTypeAnnual
	}

	limit := defaultPeriodLimit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
			if limit > maxPeriodLimit {
				limit = maxPeriodLimit
			}
		}
	}

	return periodType, limit
}

// formatLargeNumber formats a number as $X.XB, $X.XM, or $X.XK.
func formatLargeNumber(n int64) string {
	abs := n
	prefix := ""
	if n < 0 {
		abs = -n
		prefix = "-"
	}

	switch {
	case abs >= 1_000_000_000_000:
		return fmt.Sprintf("%s$%.1fT", prefix, float64(abs)/1_000_000_000_000)
	case abs >= 1_000_000_000:
		return fmt.Sprintf("%s$%.1fB", prefix, float64(abs)/1_000_000_000)
	case abs >= 1_000_000:
		return fmt.Sprintf("%s$%.1fM", prefix, float64(abs)/1_000_000)
	case abs >= 1_000:
		return fmt.Sprintf("%s$%.1fK", prefix, float64(abs)/1_000)
	default:
		return fmt.Sprintf("%s$%d", prefix, abs)
	}
}

// safePercent calculates (numerator/denominator)*100, returning 0 if denominator is 0.
func safePercent(numerator, denominator int64) float64 {
	if denominator == 0 {
		return 0
	}
	return round2(float64(numerator) / float64(denominator) * 100)
}

// safeRatio calculates numerator/denominator, returning 0 if denominator is 0.
func safeRatio(numerator, denominator float64) float64 {
	if denominator == 0 {
		return 0
	}
	return round2(numerator / denominator)
}

// computeGrowth calculates YoY growth rate as a percentage.
func computeGrowth(current, previous int64) *float64 {
	if previous == 0 {
		return nil
	}
	growth := round2((float64(current) - float64(previous)) / float64(previous) * 100)
	return &growth
}

// computeGrowthFloat calculates YoY growth rate for float values.
func computeGrowthFloat(current, previous float64) *float64 {
	if previous == 0 {
		return nil
	}
	growth := round2((current - previous) / previous * 100)
	return &growth
}

// round2 rounds a float to 2 decimal places.
func round2(f float64) float64 {
	return math.Round(f*100) / 100
}

// Ensure time is imported (used for FilingDate formatting)
var _ = time.Now
