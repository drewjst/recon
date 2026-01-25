package scores

// CalculatePiotroskiScore computes the F-Score (0-9) based on
// profitability, leverage, and efficiency metrics.
//
// Each of the 9 criteria scores 1 point if passed.
// Score >= 7 indicates strong financial health.
// Score <= 3 indicates potential weakness.
func CalculatePiotroskiScore(current, previous *FinancialData) PiotroskiResult {
	result := PiotroskiResult{
		Breakdown: PiotroskiBreakdown{},
	}

	// Profitability signals (4 points)
	result.Breakdown.PositiveNetIncome = current.NetIncome > 0
	result.Breakdown.PositiveROA = calculateROA(current) > 0
	result.Breakdown.PositiveOperatingCashFlow = current.OperatingCashFlow > 0
	result.Breakdown.CashFlowGreaterThanNetIncome = current.OperatingCashFlow > current.NetIncome

	// Leverage & Liquidity signals (3 points)
	result.Breakdown.LowerLongTermDebt = hasLowerLongTermDebt(current, previous)
	result.Breakdown.HigherCurrentRatio = hasHigherCurrentRatio(current, previous)
	result.Breakdown.NoNewShares = hasNoNewShares(current, previous)

	// Operating Efficiency signals (2 points)
	result.Breakdown.HigherGrossMargin = hasHigherGrossMargin(current, previous)
	result.Breakdown.HigherAssetTurnover = hasHigherAssetTurnover(current, previous)

	// Count passing criteria
	result.Score = countPassingCriteria(result.Breakdown)

	return result
}

// calculateROA returns Return on Assets (Net Income / Total Assets).
func calculateROA(data *FinancialData) float64 {
	if data.TotalAssets == 0 {
		return 0
	}
	return data.NetIncome / data.TotalAssets
}

// hasLowerLongTermDebt checks if long-term debt ratio decreased YoY.
func hasLowerLongTermDebt(current, previous *FinancialData) bool {
	if previous.TotalAssets == 0 || current.TotalAssets == 0 {
		return false
	}
	currentRatio := current.LongTermDebt / current.TotalAssets
	previousRatio := previous.LongTermDebt / previous.TotalAssets
	return currentRatio < previousRatio
}

// hasHigherCurrentRatio checks if current ratio increased YoY.
func hasHigherCurrentRatio(current, previous *FinancialData) bool {
	currentRatio := calculateCurrentRatio(current)
	previousRatio := calculateCurrentRatio(previous)

	if previousRatio == 0 {
		return currentRatio > 0
	}
	return currentRatio > previousRatio
}

// calculateCurrentRatio returns Current Assets / Current Liabilities.
func calculateCurrentRatio(data *FinancialData) float64 {
	if data.CurrentLiabilities == 0 {
		return 0
	}
	return data.CurrentAssets / data.CurrentLiabilities
}

// hasNoNewShares checks if shares outstanding didn't increase.
func hasNoNewShares(current, previous *FinancialData) bool {
	if previous.SharesOutstanding == 0 {
		return true // No previous data, assume no dilution
	}
	return current.SharesOutstanding <= previous.SharesOutstanding
}

// hasHigherGrossMargin checks if gross margin increased YoY.
func hasHigherGrossMargin(current, previous *FinancialData) bool {
	currentMargin := calculateGrossMargin(current)
	previousMargin := calculateGrossMargin(previous)

	if previousMargin == 0 {
		return currentMargin > 0
	}
	return currentMargin > previousMargin
}

// calculateGrossMargin returns Gross Profit / Revenue.
func calculateGrossMargin(data *FinancialData) float64 {
	if data.Revenue == 0 {
		return 0
	}
	return data.GrossProfit / data.Revenue
}

// hasHigherAssetTurnover checks if asset turnover increased YoY.
func hasHigherAssetTurnover(current, previous *FinancialData) bool {
	currentTurnover := calculateAssetTurnover(current)
	previousTurnover := calculateAssetTurnover(previous)

	if previousTurnover == 0 {
		return currentTurnover > 0
	}
	return currentTurnover > previousTurnover
}

// calculateAssetTurnover returns Revenue / Total Assets.
func calculateAssetTurnover(data *FinancialData) float64 {
	if data.TotalAssets == 0 {
		return 0
	}
	return data.Revenue / data.TotalAssets
}

// countPassingCriteria counts the number of true values in the breakdown.
func countPassingCriteria(b PiotroskiBreakdown) int {
	count := 0
	if b.PositiveNetIncome {
		count++
	}
	if b.PositiveROA {
		count++
	}
	if b.PositiveOperatingCashFlow {
		count++
	}
	if b.CashFlowGreaterThanNetIncome {
		count++
	}
	if b.LowerLongTermDebt {
		count++
	}
	if b.HigherCurrentRatio {
		count++
	}
	if b.NoNewShares {
		count++
	}
	if b.HigherGrossMargin {
		count++
	}
	if b.HigherAssetTurnover {
		count++
	}
	return count
}
