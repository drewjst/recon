// Package repository provides infrastructure implementations of domain repositories.
package repository

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/drewjst/crux/apps/api/internal/domain/repository"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/db"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
	"gorm.io/gorm"
)

const (
	// StalenessThreshold is the age after which cached data is considered stale.
	// 7 days catches quarterly earnings updates.
	StalenessThreshold = 7 * 24 * time.Hour
)

// FinancialsRepositoryImpl implements FinancialsRepository with DB caching and FMP fallback.
type FinancialsRepositoryImpl struct {
	db        *gorm.DB
	fmpClient *fmp.Client
}

// NewFinancialsRepository creates a new FinancialsRepositoryImpl.
// db may be nil (runs without caching), fmpClient is required.
func NewFinancialsRepository(database *gorm.DB, fmpClient *fmp.Client) *FinancialsRepositoryImpl {
	return &FinancialsRepositoryImpl{
		db:        database,
		fmpClient: fmpClient,
	}
}

// GetIncomeStatements retrieves income statements, checking DB first then FMP.
func (r *FinancialsRepositoryImpl) GetIncomeStatements(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.IncomeStatement, error) {
	// TTM not supported for direct statement retrieval
	if periodType == repository.PeriodTypeTTM {
		return nil, fmt.Errorf("TTM not supported for income statements")
	}

	// Try DB first
	if r.db != nil {
		cached, fetchedAt, err := r.getIncomeStatementsFromDB(ctx, ticker, periodType, limit)
		if err != nil {
			slog.Warn("failed to read income statements from DB", "ticker", ticker, "error", err)
		} else if len(cached) > 0 && !r.isStale(fetchedAt) {
			slog.Debug("income statements cache hit", "ticker", ticker, "count", len(cached))
			return cached, nil
		}
	}

	// Fetch from FMP
	statements, err := r.fetchIncomeStatementsFromFMP(ctx, ticker, periodType, limit)
	if err != nil {
		// Return cached data if FMP fails but we have something
		if r.db != nil {
			cached, _, _ := r.getIncomeStatementsFromDB(ctx, ticker, periodType, limit)
			if len(cached) > 0 {
				slog.Warn("FMP failed, returning stale cache", "ticker", ticker, "error", err)
				return cached, nil
			}
		}
		return nil, fmt.Errorf("fetching income statements from FMP: %w", err)
	}

	// Upsert to DB (don't fail if this fails)
	if r.db != nil && len(statements) > 0 {
		if err := r.upsertIncomeStatements(ctx, ticker, periodType, statements); err != nil {
			slog.Error("failed to cache income statements", "ticker", ticker, "error", err)
		}
	}

	return statements, nil
}

// GetBalanceSheets retrieves balance sheets, checking DB first then FMP.
func (r *FinancialsRepositoryImpl) GetBalanceSheets(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.BalanceSheet, error) {
	if periodType == repository.PeriodTypeTTM {
		return nil, fmt.Errorf("TTM not supported for balance sheets")
	}

	// Try DB first
	if r.db != nil {
		cached, fetchedAt, err := r.getBalanceSheetsFromDB(ctx, ticker, periodType, limit)
		if err != nil {
			slog.Warn("failed to read balance sheets from DB", "ticker", ticker, "error", err)
		} else if len(cached) > 0 && !r.isStale(fetchedAt) {
			slog.Debug("balance sheets cache hit", "ticker", ticker, "count", len(cached))
			return cached, nil
		}
	}

	// Fetch from FMP
	sheets, err := r.fetchBalanceSheetsFromFMP(ctx, ticker, periodType, limit)
	if err != nil {
		if r.db != nil {
			cached, _, _ := r.getBalanceSheetsFromDB(ctx, ticker, periodType, limit)
			if len(cached) > 0 {
				slog.Warn("FMP failed, returning stale cache", "ticker", ticker, "error", err)
				return cached, nil
			}
		}
		return nil, fmt.Errorf("fetching balance sheets from FMP: %w", err)
	}

	// Upsert to DB
	if r.db != nil && len(sheets) > 0 {
		if err := r.upsertBalanceSheets(ctx, ticker, periodType, sheets); err != nil {
			slog.Error("failed to cache balance sheets", "ticker", ticker, "error", err)
		}
	}

	return sheets, nil
}

// GetCashFlowStatements retrieves cash flow statements, checking DB first then FMP.
func (r *FinancialsRepositoryImpl) GetCashFlowStatements(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.CashFlowStatement, error) {
	if periodType == repository.PeriodTypeTTM {
		return nil, fmt.Errorf("TTM not supported for cash flow statements")
	}

	// Try DB first
	if r.db != nil {
		cached, fetchedAt, err := r.getCashFlowStatementsFromDB(ctx, ticker, periodType, limit)
		if err != nil {
			slog.Warn("failed to read cash flow statements from DB", "ticker", ticker, "error", err)
		} else if len(cached) > 0 && !r.isStale(fetchedAt) {
			slog.Debug("cash flow statements cache hit", "ticker", ticker, "count", len(cached))
			return cached, nil
		}
	}

	// Fetch from FMP
	statements, err := r.fetchCashFlowStatementsFromFMP(ctx, ticker, periodType, limit)
	if err != nil {
		if r.db != nil {
			cached, _, _ := r.getCashFlowStatementsFromDB(ctx, ticker, periodType, limit)
			if len(cached) > 0 {
				slog.Warn("FMP failed, returning stale cache", "ticker", ticker, "error", err)
				return cached, nil
			}
		}
		return nil, fmt.Errorf("fetching cash flow statements from FMP: %w", err)
	}

	// Upsert to DB
	if r.db != nil && len(statements) > 0 {
		if err := r.upsertCashFlowStatements(ctx, ticker, periodType, statements); err != nil {
			slog.Error("failed to cache cash flow statements", "ticker", ticker, "error", err)
		}
	}

	return statements, nil
}

// GetRevenueSegments retrieves revenue segments. Currently FMP doesn't provide this,
// so this is a placeholder for future implementation.
func (r *FinancialsRepositoryImpl) GetRevenueSegments(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.RevenueSegment, error) {
	// FMP doesn't have a dedicated revenue segments endpoint
	// This would need to be extracted from SEC filings or another provider
	return nil, nil
}

// isStale checks if the fetched data is older than the staleness threshold.
func (r *FinancialsRepositoryImpl) isStale(fetchedAt time.Time) bool {
	return time.Since(fetchedAt) > StalenessThreshold
}

// =============================================================================
// DB Operations - Income Statements
// =============================================================================

func (r *FinancialsRepositoryImpl) getIncomeStatementsFromDB(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.IncomeStatement, time.Time, error) {
	var models []db.IncomeStatementModel
	var fetchedAt time.Time

	err := r.db.WithContext(ctx).
		Joins("Period").
		Where("\"Period\".ticker = ? AND \"Period\".period_type = ?", ticker, string(periodType)).
		Order("\"Period\".period_end DESC").
		Limit(limit).
		Find(&models).Error

	if err != nil {
		return nil, fetchedAt, fmt.Errorf("querying income statements: %w", err)
	}

	if len(models) == 0 {
		return nil, fetchedAt, nil
	}

	fetchedAt = models[0].Period.FetchedAt
	statements := make([]repository.IncomeStatement, len(models))
	for i, m := range models {
		statements[i] = r.incomeStatementModelToDomain(m)
	}

	return statements, fetchedAt, nil
}

func (r *FinancialsRepositoryImpl) upsertIncomeStatements(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	statements []repository.IncomeStatement,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, stmt := range statements {
			// Upsert financial period
			period := db.FinancialPeriod{
				Ticker:        ticker,
				PeriodType:    string(periodType),
				PeriodEnd:     stmt.PeriodEnd,
				FiscalYear:    stmt.FiscalYear,
				FiscalQuarter: stmt.FiscalQuarter,
				FilingDate:    stmt.FilingDate,
				Source:        "fmp",
				FetchedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}

			err := tx.Where("ticker = ? AND period_type = ? AND period_end = ?",
				ticker, string(periodType), stmt.PeriodEnd).
				Assign(period).
				FirstOrCreate(&period).Error
			if err != nil {
				return fmt.Errorf("upserting financial period: %w", err)
			}

			// Upsert income statement
			model := r.incomeStatementDomainToModel(stmt, period.ID)
			err = tx.Where("period_id = ?", period.ID).
				Assign(model).
				FirstOrCreate(&model).Error
			if err != nil {
				return fmt.Errorf("upserting income statement: %w", err)
			}
		}
		return nil
	})
}

// =============================================================================
// DB Operations - Balance Sheets
// =============================================================================

func (r *FinancialsRepositoryImpl) getBalanceSheetsFromDB(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.BalanceSheet, time.Time, error) {
	var models []db.BalanceSheetModel
	var fetchedAt time.Time

	err := r.db.WithContext(ctx).
		Joins("Period").
		Where("\"Period\".ticker = ? AND \"Period\".period_type = ?", ticker, string(periodType)).
		Order("\"Period\".period_end DESC").
		Limit(limit).
		Find(&models).Error

	if err != nil {
		return nil, fetchedAt, fmt.Errorf("querying balance sheets: %w", err)
	}

	if len(models) == 0 {
		return nil, fetchedAt, nil
	}

	fetchedAt = models[0].Period.FetchedAt
	sheets := make([]repository.BalanceSheet, len(models))
	for i, m := range models {
		sheets[i] = r.balanceSheetModelToDomain(m)
	}

	return sheets, fetchedAt, nil
}

func (r *FinancialsRepositoryImpl) upsertBalanceSheets(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	sheets []repository.BalanceSheet,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, sheet := range sheets {
			period := db.FinancialPeriod{
				Ticker:        ticker,
				PeriodType:    string(periodType),
				PeriodEnd:     sheet.PeriodEnd,
				FiscalYear:    sheet.FiscalYear,
				FiscalQuarter: sheet.FiscalQuarter,
				FilingDate:    sheet.FilingDate,
				Source:        "fmp",
				FetchedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}

			err := tx.Where("ticker = ? AND period_type = ? AND period_end = ?",
				ticker, string(periodType), sheet.PeriodEnd).
				Assign(period).
				FirstOrCreate(&period).Error
			if err != nil {
				return fmt.Errorf("upserting financial period: %w", err)
			}

			model := r.balanceSheetDomainToModel(sheet, period.ID)
			err = tx.Where("period_id = ?", period.ID).
				Assign(model).
				FirstOrCreate(&model).Error
			if err != nil {
				return fmt.Errorf("upserting balance sheet: %w", err)
			}
		}
		return nil
	})
}

// =============================================================================
// DB Operations - Cash Flow Statements
// =============================================================================

func (r *FinancialsRepositoryImpl) getCashFlowStatementsFromDB(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.CashFlowStatement, time.Time, error) {
	var models []db.CashFlowStatementModel
	var fetchedAt time.Time

	err := r.db.WithContext(ctx).
		Joins("Period").
		Where("\"Period\".ticker = ? AND \"Period\".period_type = ?", ticker, string(periodType)).
		Order("\"Period\".period_end DESC").
		Limit(limit).
		Find(&models).Error

	if err != nil {
		return nil, fetchedAt, fmt.Errorf("querying cash flow statements: %w", err)
	}

	if len(models) == 0 {
		return nil, fetchedAt, nil
	}

	fetchedAt = models[0].Period.FetchedAt
	statements := make([]repository.CashFlowStatement, len(models))
	for i, m := range models {
		statements[i] = r.cashFlowStatementModelToDomain(m)
	}

	return statements, fetchedAt, nil
}

func (r *FinancialsRepositoryImpl) upsertCashFlowStatements(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	statements []repository.CashFlowStatement,
) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, stmt := range statements {
			period := db.FinancialPeriod{
				Ticker:        ticker,
				PeriodType:    string(periodType),
				PeriodEnd:     stmt.PeriodEnd,
				FiscalYear:    stmt.FiscalYear,
				FiscalQuarter: stmt.FiscalQuarter,
				FilingDate:    stmt.FilingDate,
				Source:        "fmp",
				FetchedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}

			err := tx.Where("ticker = ? AND period_type = ? AND period_end = ?",
				ticker, string(periodType), stmt.PeriodEnd).
				Assign(period).
				FirstOrCreate(&period).Error
			if err != nil {
				return fmt.Errorf("upserting financial period: %w", err)
			}

			model := r.cashFlowStatementDomainToModel(stmt, period.ID)
			err = tx.Where("period_id = ?", period.ID).
				Assign(model).
				FirstOrCreate(&model).Error
			if err != nil {
				return fmt.Errorf("upserting cash flow statement: %w", err)
			}
		}
		return nil
	})
}

// =============================================================================
// FMP Operations
// =============================================================================

func (r *FinancialsRepositoryImpl) fetchIncomeStatementsFromFMP(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.IncomeStatement, error) {
	var fmpStatements []fmp.IncomeStatement
	var err error

	if periodType == repository.PeriodTypeQuarterly {
		fmpStatements, err = r.fmpClient.GetQuarterlyIncomeStatement(ctx, ticker, limit)
	} else {
		fmpStatements, err = r.fmpClient.GetIncomeStatement(ctx, ticker, limit)
	}

	if err != nil {
		return nil, err
	}

	statements := make([]repository.IncomeStatement, len(fmpStatements))
	for i, f := range fmpStatements {
		statements[i] = r.fmpIncomeStatementToDomain(f, periodType)
	}

	return statements, nil
}

func (r *FinancialsRepositoryImpl) fetchBalanceSheetsFromFMP(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.BalanceSheet, error) {
	var fmpSheets []fmp.BalanceSheet
	var err error

	if periodType == repository.PeriodTypeQuarterly {
		fmpSheets, err = r.fmpClient.GetQuarterlyBalanceSheet(ctx, ticker, limit)
	} else {
		fmpSheets, err = r.fmpClient.GetBalanceSheet(ctx, ticker, limit)
	}

	if err != nil {
		return nil, err
	}

	sheets := make([]repository.BalanceSheet, len(fmpSheets))
	for i, f := range fmpSheets {
		sheets[i] = r.fmpBalanceSheetToDomain(f, periodType)
	}

	return sheets, nil
}

func (r *FinancialsRepositoryImpl) fetchCashFlowStatementsFromFMP(
	ctx context.Context,
	ticker string,
	periodType repository.PeriodType,
	limit int,
) ([]repository.CashFlowStatement, error) {
	var fmpStatements []fmp.CashFlowStatement
	var err error

	if periodType == repository.PeriodTypeQuarterly {
		fmpStatements, err = r.fmpClient.GetQuarterlyCashFlowStatement(ctx, ticker, limit)
	} else {
		fmpStatements, err = r.fmpClient.GetCashFlowStatement(ctx, ticker, limit)
	}

	if err != nil {
		return nil, err
	}

	statements := make([]repository.CashFlowStatement, len(fmpStatements))
	for i, f := range fmpStatements {
		statements[i] = r.fmpCashFlowStatementToDomain(f, periodType)
	}

	return statements, nil
}

// =============================================================================
// Mappers: FMP -> Domain
// =============================================================================

func (r *FinancialsRepositoryImpl) fmpIncomeStatementToDomain(f fmp.IncomeStatement, periodType repository.PeriodType) repository.IncomeStatement {
	periodEnd := parseDate(f.Date)
	filingDate := parseDatePtr(f.FilingDate)
	fiscalYear := parseYear(f.FiscalYear)
	fiscalQuarter := parseFiscalQuarter(f.Period)

	return repository.IncomeStatement{
		Ticker:        f.Symbol,
		PeriodEnd:     periodEnd,
		PeriodType:    periodType,
		FiscalYear:    fiscalYear,
		FiscalQuarter: fiscalQuarter,
		FilingDate:    filingDate,

		Revenue:        int64(f.Revenue),
		CostOfRevenue:  int64(f.CostOfRevenue),
		GrossProfit:    int64(f.GrossProfit),

		OperatingExpenses: int64(f.OperatingExpenses),
		OperatingIncome:   int64(f.OperatingIncome),

		InterestIncome:   int64(f.InterestIncome),
		InterestExpense:  int64(f.InterestExpense),
		IncomeBeforeTax:  int64(f.IncomeBeforeTax),
		IncomeTaxExpense: int64(f.IncomeTaxExpense),

		NetIncome:         int64(f.NetIncome),
		NetIncomeToCommon: int64(f.BottomLineNetIncome),

		EPSBasic:                 f.EPS,
		EPSDiluted:               f.EPSDiluted,
		WeightedAvgSharesBasic:   f.WeightedAvgSharesOut,
		WeightedAvgSharesDiluted: f.WeightedAvgSharesDil,

		EBITDA: int64(f.EBITDA),

		FetchedAt: time.Now(),
	}
}

func (r *FinancialsRepositoryImpl) fmpBalanceSheetToDomain(f fmp.BalanceSheet, periodType repository.PeriodType) repository.BalanceSheet {
	periodEnd := parseDate(f.Date)
	filingDate := parseDatePtr(f.FilingDate)
	fiscalYear := parseYear(f.FiscalYear)
	fiscalQuarter := parseFiscalQuarter(f.Period)

	return repository.BalanceSheet{
		Ticker:        f.Symbol,
		PeriodEnd:     periodEnd,
		PeriodType:    periodType,
		FiscalYear:    fiscalYear,
		FiscalQuarter: fiscalQuarter,
		FilingDate:    filingDate,

		CashAndEquivalents:  int64(f.CashAndCashEquivalents),
		AccountsReceivable:  int64(f.AccountsReceivables),
		Inventory:           int64(f.Inventory),
		TotalCurrentAssets:  int64(f.TotalCurrentAssets),

		TotalNonCurrentAssets: int64(f.TotalNonCurrentAssets),
		TotalAssets:          int64(f.TotalAssets),

		AccountsPayable:         int64(f.AccountPayables),
		ShortTermDebt:           int64(f.ShortTermDebt),
		TotalCurrentLiabilities: int64(f.TotalCurrentLiabilities),

		LongTermDebt:        int64(f.LongTermDebt),
		TotalNonCurrentLiab: int64(f.TotalNonCurrentLiab),
		TotalLiabilities:    int64(f.TotalLiabilities),

		CommonStock:             int64(f.CommonStock),
		RetainedEarnings:        int64(f.RetainedEarnings),
		TotalStockholdersEquity: int64(f.TotalStockholdersEquity),
		TotalEquity:             int64(f.TotalEquity),

		TotalDebt: int64(f.TotalDebt),
		NetDebt:   int64(f.NetDebt),

		FetchedAt: time.Now(),
	}
}

func (r *FinancialsRepositoryImpl) fmpCashFlowStatementToDomain(f fmp.CashFlowStatement, periodType repository.PeriodType) repository.CashFlowStatement {
	periodEnd := parseDate(f.Date)
	filingDate := parseDatePtr(f.FilingDate)
	fiscalYear := parseYear(f.FiscalYear)
	fiscalQuarter := parseFiscalQuarter(f.Period)

	return repository.CashFlowStatement{
		Ticker:        f.Symbol,
		PeriodEnd:     periodEnd,
		PeriodType:    periodType,
		FiscalYear:    fiscalYear,
		FiscalQuarter: fiscalQuarter,
		FilingDate:    filingDate,

		NetIncome:         int64(f.NetIncome),
		OperatingCashFlow: int64(f.OperatingCashFlow),

		CapitalExpenditures: int64(f.CapitalExpenditure),
		InvestingCashFlow:   int64(f.NetCashFromInvesting),

		CommonStockRepurchased: int64(f.CommonStockRepurchased),
		DividendsPaid:          int64(f.DividendsPaid),
		FinancingCashFlow:      int64(f.NetCashFromFinancing),

		FreeCashFlow: int64(f.FreeCashFlow),

		FetchedAt: time.Now(),
	}
}

// =============================================================================
// Mappers: DB Model -> Domain
// =============================================================================

func (r *FinancialsRepositoryImpl) incomeStatementModelToDomain(m db.IncomeStatementModel) repository.IncomeStatement {
	return repository.IncomeStatement{
		Ticker:        m.Period.Ticker,
		PeriodEnd:     m.Period.PeriodEnd,
		PeriodType:    repository.PeriodType(m.Period.PeriodType),
		FiscalYear:    m.Period.FiscalYear,
		FiscalQuarter: m.Period.FiscalQuarter,
		FilingDate:    m.Period.FilingDate,

		Revenue:        derefInt64(m.Revenue),
		CostOfRevenue:  derefInt64(m.CostOfRevenue),
		GrossProfit:    derefInt64(m.GrossProfit),

		ResearchAndDevelopment: derefInt64(m.ResearchAndDevelopment),
		SellingGeneralAdmin:    derefInt64(m.SellingGeneralAdmin),
		OperatingExpenses:      derefInt64(m.OperatingExpenses),
		OperatingIncome:        derefInt64(m.OperatingIncome),

		InterestIncome:   derefInt64(m.InterestIncome),
		InterestExpense:  derefInt64(m.InterestExpense),
		OtherIncomeExp:   derefInt64(m.OtherIncomeExp),
		IncomeBeforeTax:  derefInt64(m.IncomeBeforeTax),
		IncomeTaxExpense: derefInt64(m.IncomeTaxExpense),

		NetIncome:         derefInt64(m.NetIncome),
		NetIncomeToCommon: derefInt64(m.NetIncomeToCommon),

		EPSBasic:                 derefFloat64(m.EPSBasic),
		EPSDiluted:               derefFloat64(m.EPSDiluted),
		WeightedAvgSharesBasic:   derefInt64(m.WeightedAvgSharesBasic),
		WeightedAvgSharesDiluted: derefInt64(m.WeightedAvgSharesDiluted),

		EBITDA:                   derefInt64(m.EBITDA),
		DepreciationAmortization: derefInt64(m.DepreciationAmortization),

		FetchedAt: m.Period.FetchedAt,
	}
}

func (r *FinancialsRepositoryImpl) balanceSheetModelToDomain(m db.BalanceSheetModel) repository.BalanceSheet {
	return repository.BalanceSheet{
		Ticker:        m.Period.Ticker,
		PeriodEnd:     m.Period.PeriodEnd,
		PeriodType:    repository.PeriodType(m.Period.PeriodType),
		FiscalYear:    m.Period.FiscalYear,
		FiscalQuarter: m.Period.FiscalQuarter,
		FilingDate:    m.Period.FilingDate,

		CashAndEquivalents:   derefInt64(m.CashAndEquivalents),
		ShortTermInvestments: derefInt64(m.ShortTermInvestments),
		CashAndShortTerm:     derefInt64(m.CashAndShortTerm),
		AccountsReceivable:   derefInt64(m.AccountsReceivable),
		Inventory:            derefInt64(m.Inventory),
		OtherCurrentAssets:   derefInt64(m.OtherCurrentAssets),
		TotalCurrentAssets:   derefInt64(m.TotalCurrentAssets),

		PropertyPlantEquipmentNet: derefInt64(m.PropertyPlantEquipmentNet),
		Goodwill:                  derefInt64(m.Goodwill),
		IntangibleAssets:          derefInt64(m.IntangibleAssets),
		LongTermInvestments:       derefInt64(m.LongTermInvestments),
		OtherNonCurrentAssets:     derefInt64(m.OtherNonCurrentAssets),
		TotalNonCurrentAssets:     derefInt64(m.TotalNonCurrentAssets),
		TotalAssets:               derefInt64(m.TotalAssets),

		AccountsPayable:            derefInt64(m.AccountsPayable),
		ShortTermDebt:              derefInt64(m.ShortTermDebt),
		CurrentPortionLongTermDebt: derefInt64(m.CurrentPortionLongTermDebt),
		DeferredRevenue:            derefInt64(m.DeferredRevenue),
		OtherCurrentLiabilities:    derefInt64(m.OtherCurrentLiabilities),
		TotalCurrentLiabilities:    derefInt64(m.TotalCurrentLiabilities),

		LongTermDebt:           derefInt64(m.LongTermDebt),
		DeferredTaxLiabilities: derefInt64(m.DeferredTaxLiabilities),
		OtherNonCurrentLiab:    derefInt64(m.OtherNonCurrentLiab),
		TotalNonCurrentLiab:    derefInt64(m.TotalNonCurrentLiab),
		TotalLiabilities:       derefInt64(m.TotalLiabilities),

		CommonStock:                   derefInt64(m.CommonStock),
		RetainedEarnings:              derefInt64(m.RetainedEarnings),
		AccumulatedOtherComprehensive: derefInt64(m.AccumulatedOtherComprehensive),
		TreasuryStock:                 derefInt64(m.TreasuryStock),
		TotalStockholdersEquity:       derefInt64(m.TotalStockholdersEquity),
		MinorityInterest:              derefInt64(m.MinorityInterest),
		TotalEquity:                   derefInt64(m.TotalEquity),

		TotalDebt: derefInt64(m.TotalDebt),
		NetDebt:   derefInt64(m.NetDebt),

		FetchedAt: m.Period.FetchedAt,
	}
}

func (r *FinancialsRepositoryImpl) cashFlowStatementModelToDomain(m db.CashFlowStatementModel) repository.CashFlowStatement {
	return repository.CashFlowStatement{
		Ticker:        m.Period.Ticker,
		PeriodEnd:     m.Period.PeriodEnd,
		PeriodType:    repository.PeriodType(m.Period.PeriodType),
		FiscalYear:    m.Period.FiscalYear,
		FiscalQuarter: m.Period.FiscalQuarter,
		FilingDate:    m.Period.FilingDate,

		NetIncome:                derefInt64(m.NetIncome),
		DepreciationAmortization: derefInt64(m.DepreciationAmortization),
		DeferredIncomeTax:        derefInt64(m.DeferredIncomeTax),
		StockBasedCompensation:   derefInt64(m.StockBasedCompensation),
		ChangeInWorkingCapital:   derefInt64(m.ChangeInWorkingCapital),
		ChangeInReceivables:      derefInt64(m.ChangeInReceivables),
		ChangeInInventory:        derefInt64(m.ChangeInInventory),
		ChangeInPayables:         derefInt64(m.ChangeInPayables),
		OtherOperatingActivities: derefInt64(m.OtherOperatingActivities),
		OperatingCashFlow:        derefInt64(m.OperatingCashFlow),

		CapitalExpenditures:      derefInt64(m.CapitalExpenditures),
		Acquisitions:             derefInt64(m.Acquisitions),
		PurchasesOfInvestments:   derefInt64(m.PurchasesOfInvestments),
		SalesOfInvestments:       derefInt64(m.SalesOfInvestments),
		OtherInvestingActivities: derefInt64(m.OtherInvestingActivities),
		InvestingCashFlow:        derefInt64(m.InvestingCashFlow),

		DebtRepayment:            derefInt64(m.DebtRepayment),
		DebtIssuance:             derefInt64(m.DebtIssuance),
		CommonStockRepurchased:   derefInt64(m.CommonStockRepurchased),
		CommonStockIssued:        derefInt64(m.CommonStockIssued),
		DividendsPaid:            derefInt64(m.DividendsPaid),
		OtherFinancingActivities: derefInt64(m.OtherFinancingActivities),
		FinancingCashFlow:        derefInt64(m.FinancingCashFlow),

		EffectOfForex:   derefInt64(m.EffectOfForex),
		NetChangeInCash: derefInt64(m.NetChangeInCash),
		CashAtBeginning: derefInt64(m.CashAtBeginning),
		CashAtEnd:       derefInt64(m.CashAtEnd),

		FreeCashFlow: derefInt64(m.FreeCashFlow),

		FetchedAt: m.Period.FetchedAt,
	}
}

// =============================================================================
// Mappers: Domain -> DB Model
// =============================================================================

func (r *FinancialsRepositoryImpl) incomeStatementDomainToModel(s repository.IncomeStatement, periodID int64) db.IncomeStatementModel {
	return db.IncomeStatementModel{
		PeriodID: periodID,

		Revenue:       ptrInt64(s.Revenue),
		CostOfRevenue: ptrInt64(s.CostOfRevenue),
		GrossProfit:   ptrInt64(s.GrossProfit),

		ResearchAndDevelopment: ptrInt64(s.ResearchAndDevelopment),
		SellingGeneralAdmin:    ptrInt64(s.SellingGeneralAdmin),
		OperatingExpenses:      ptrInt64(s.OperatingExpenses),
		OperatingIncome:        ptrInt64(s.OperatingIncome),

		InterestIncome:   ptrInt64(s.InterestIncome),
		InterestExpense:  ptrInt64(s.InterestExpense),
		OtherIncomeExp:   ptrInt64(s.OtherIncomeExp),
		IncomeBeforeTax:  ptrInt64(s.IncomeBeforeTax),
		IncomeTaxExpense: ptrInt64(s.IncomeTaxExpense),

		NetIncome:         ptrInt64(s.NetIncome),
		NetIncomeToCommon: ptrInt64(s.NetIncomeToCommon),

		EPSBasic:                 ptrFloat64(s.EPSBasic),
		EPSDiluted:               ptrFloat64(s.EPSDiluted),
		WeightedAvgSharesBasic:   ptrInt64(s.WeightedAvgSharesBasic),
		WeightedAvgSharesDiluted: ptrInt64(s.WeightedAvgSharesDiluted),

		EBITDA:                   ptrInt64(s.EBITDA),
		DepreciationAmortization: ptrInt64(s.DepreciationAmortization),

		UpdatedAt: time.Now(),
	}
}

func (r *FinancialsRepositoryImpl) balanceSheetDomainToModel(s repository.BalanceSheet, periodID int64) db.BalanceSheetModel {
	return db.BalanceSheetModel{
		PeriodID: periodID,

		CashAndEquivalents:   ptrInt64(s.CashAndEquivalents),
		ShortTermInvestments: ptrInt64(s.ShortTermInvestments),
		CashAndShortTerm:     ptrInt64(s.CashAndShortTerm),
		AccountsReceivable:   ptrInt64(s.AccountsReceivable),
		Inventory:            ptrInt64(s.Inventory),
		OtherCurrentAssets:   ptrInt64(s.OtherCurrentAssets),
		TotalCurrentAssets:   ptrInt64(s.TotalCurrentAssets),

		PropertyPlantEquipmentNet: ptrInt64(s.PropertyPlantEquipmentNet),
		Goodwill:                  ptrInt64(s.Goodwill),
		IntangibleAssets:          ptrInt64(s.IntangibleAssets),
		LongTermInvestments:       ptrInt64(s.LongTermInvestments),
		OtherNonCurrentAssets:     ptrInt64(s.OtherNonCurrentAssets),
		TotalNonCurrentAssets:     ptrInt64(s.TotalNonCurrentAssets),
		TotalAssets:               ptrInt64(s.TotalAssets),

		AccountsPayable:            ptrInt64(s.AccountsPayable),
		ShortTermDebt:              ptrInt64(s.ShortTermDebt),
		CurrentPortionLongTermDebt: ptrInt64(s.CurrentPortionLongTermDebt),
		DeferredRevenue:            ptrInt64(s.DeferredRevenue),
		OtherCurrentLiabilities:    ptrInt64(s.OtherCurrentLiabilities),
		TotalCurrentLiabilities:    ptrInt64(s.TotalCurrentLiabilities),

		LongTermDebt:           ptrInt64(s.LongTermDebt),
		DeferredTaxLiabilities: ptrInt64(s.DeferredTaxLiabilities),
		OtherNonCurrentLiab:    ptrInt64(s.OtherNonCurrentLiab),
		TotalNonCurrentLiab:    ptrInt64(s.TotalNonCurrentLiab),
		TotalLiabilities:       ptrInt64(s.TotalLiabilities),

		CommonStock:                   ptrInt64(s.CommonStock),
		RetainedEarnings:              ptrInt64(s.RetainedEarnings),
		AccumulatedOtherComprehensive: ptrInt64(s.AccumulatedOtherComprehensive),
		TreasuryStock:                 ptrInt64(s.TreasuryStock),
		TotalStockholdersEquity:       ptrInt64(s.TotalStockholdersEquity),
		MinorityInterest:              ptrInt64(s.MinorityInterest),
		TotalEquity:                   ptrInt64(s.TotalEquity),

		TotalDebt: ptrInt64(s.TotalDebt),
		NetDebt:   ptrInt64(s.NetDebt),

		UpdatedAt: time.Now(),
	}
}

func (r *FinancialsRepositoryImpl) cashFlowStatementDomainToModel(s repository.CashFlowStatement, periodID int64) db.CashFlowStatementModel {
	return db.CashFlowStatementModel{
		PeriodID: periodID,

		NetIncome:                ptrInt64(s.NetIncome),
		DepreciationAmortization: ptrInt64(s.DepreciationAmortization),
		DeferredIncomeTax:        ptrInt64(s.DeferredIncomeTax),
		StockBasedCompensation:   ptrInt64(s.StockBasedCompensation),
		ChangeInWorkingCapital:   ptrInt64(s.ChangeInWorkingCapital),
		ChangeInReceivables:      ptrInt64(s.ChangeInReceivables),
		ChangeInInventory:        ptrInt64(s.ChangeInInventory),
		ChangeInPayables:         ptrInt64(s.ChangeInPayables),
		OtherOperatingActivities: ptrInt64(s.OtherOperatingActivities),
		OperatingCashFlow:        ptrInt64(s.OperatingCashFlow),

		CapitalExpenditures:      ptrInt64(s.CapitalExpenditures),
		Acquisitions:             ptrInt64(s.Acquisitions),
		PurchasesOfInvestments:   ptrInt64(s.PurchasesOfInvestments),
		SalesOfInvestments:       ptrInt64(s.SalesOfInvestments),
		OtherInvestingActivities: ptrInt64(s.OtherInvestingActivities),
		InvestingCashFlow:        ptrInt64(s.InvestingCashFlow),

		DebtRepayment:            ptrInt64(s.DebtRepayment),
		DebtIssuance:             ptrInt64(s.DebtIssuance),
		CommonStockRepurchased:   ptrInt64(s.CommonStockRepurchased),
		CommonStockIssued:        ptrInt64(s.CommonStockIssued),
		DividendsPaid:            ptrInt64(s.DividendsPaid),
		OtherFinancingActivities: ptrInt64(s.OtherFinancingActivities),
		FinancingCashFlow:        ptrInt64(s.FinancingCashFlow),

		EffectOfForex:   ptrInt64(s.EffectOfForex),
		NetChangeInCash: ptrInt64(s.NetChangeInCash),
		CashAtBeginning: ptrInt64(s.CashAtBeginning),
		CashAtEnd:       ptrInt64(s.CashAtEnd),

		// FreeCashFlow is computed by DB, don't set it

		UpdatedAt: time.Now(),
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

func parseDate(s string) time.Time {
	t, _ := time.Parse("2006-01-02", s)
	return t
}

func parseDatePtr(s string) *time.Time {
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func parseYear(s string) int {
	year, _ := strconv.Atoi(s)
	return year
}

func parseFiscalQuarter(period string) *int {
	switch period {
	case "Q1":
		q := 1
		return &q
	case "Q2":
		q := 2
		return &q
	case "Q3":
		q := 3
		return &q
	case "Q4":
		q := 4
		return &q
	default:
		return nil // FY or unknown
	}
}

func derefInt64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func derefFloat64(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

func ptrInt64(v int64) *int64 {
	if v == 0 {
		return nil
	}
	return &v
}

func ptrFloat64(v float64) *float64 {
	if v == 0 {
		return nil
	}
	return &v
}
