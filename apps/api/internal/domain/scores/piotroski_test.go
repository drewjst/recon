package scores

import "testing"

func TestCalculatePiotroskiScore_AllCriteriaPassing(t *testing.T) {
	current := FinancialData{
		NetIncome:          1000000,
		TotalAssets:        5000000,
		OperatingCashFlow:  1200000,
		LongTermDebt:       500000,
		CurrentAssets:      2000000,
		CurrentLiabilities: 1000000,
		SharesOutstanding:  1000000,
		GrossProfit:        3000000,
		Revenue:            6000000, // Higher revenue for higher asset turnover
	}

	previous := FinancialData{
		NetIncome:          800000,
		TotalAssets:        5000000,
		OperatingCashFlow:  900000,
		LongTermDebt:       700000,
		CurrentAssets:      1500000,
		CurrentLiabilities: 1000000,
		SharesOutstanding:  1000000,
		GrossProfit:        2400000, // Lower gross margin (48%) vs current (50%)
		Revenue:            5000000,
	}

	result := CalculatePiotroskiScore(&current, &previous)

	if result.Score != 9 {
		t.Errorf("expected score 9, got %d", result.Score)
		t.Logf("Breakdown: %+v", result.Breakdown)
	}
}

func TestCalculatePiotroskiScore_PositiveNetIncome(t *testing.T) {
	tests := []struct {
		name      string
		netIncome float64
		want      bool
	}{
		{"positive", 100, true},
		{"zero", 0, false},
		{"negative", -100, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current := FinancialData{NetIncome: tt.netIncome}
			result := CalculatePiotroskiScore(&current, &FinancialData{})

			if result.Breakdown.PositiveNetIncome != tt.want {
				t.Errorf("PositiveNetIncome = %v, want %v", result.Breakdown.PositiveNetIncome, tt.want)
			}
		})
	}
}

func TestCalculatePiotroskiScore_PositiveROA(t *testing.T) {
	tests := []struct {
		name        string
		netIncome   float64
		totalAssets float64
		want        bool
	}{
		{"positive ROA", 100, 1000, true},
		{"zero ROA", 0, 1000, false},
		{"negative ROA", -100, 1000, false},
		{"zero assets", 100, 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current := FinancialData{
				NetIncome:   tt.netIncome,
				TotalAssets: tt.totalAssets,
			}
			result := CalculatePiotroskiScore(&current, &FinancialData{})

			if result.Breakdown.PositiveROA != tt.want {
				t.Errorf("PositiveROA = %v, want %v", result.Breakdown.PositiveROA, tt.want)
			}
		})
	}
}

func TestCalculatePiotroskiScore_CashFlowGreaterThanNetIncome(t *testing.T) {
	tests := []struct {
		name              string
		operatingCashFlow float64
		netIncome         float64
		want              bool
	}{
		{"cash flow > net income", 150, 100, true},
		{"cash flow = net income", 100, 100, false},
		{"cash flow < net income", 80, 100, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current := FinancialData{
				OperatingCashFlow: tt.operatingCashFlow,
				NetIncome:         tt.netIncome,
			}
			result := CalculatePiotroskiScore(&current, &FinancialData{})

			if result.Breakdown.CashFlowGreaterThanNetIncome != tt.want {
				t.Errorf("CashFlowGreaterThanNetIncome = %v, want %v",
					result.Breakdown.CashFlowGreaterThanNetIncome, tt.want)
			}
		})
	}
}

func TestCalculatePiotroskiScore_LowerLongTermDebt(t *testing.T) {
	tests := []struct {
		name         string
		currentDebt  float64
		previousDebt float64
		assets       float64
		want         bool
	}{
		{"debt decreased", 400, 600, 1000, true},
		{"debt same", 500, 500, 1000, false},
		{"debt increased", 600, 400, 1000, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current := FinancialData{
				LongTermDebt: tt.currentDebt,
				TotalAssets:  tt.assets,
			}
			previous := FinancialData{
				LongTermDebt: tt.previousDebt,
				TotalAssets:  tt.assets,
			}
			result := CalculatePiotroskiScore(&current, &previous)

			if result.Breakdown.LowerLongTermDebt != tt.want {
				t.Errorf("LowerLongTermDebt = %v, want %v", result.Breakdown.LowerLongTermDebt, tt.want)
			}
		})
	}
}

func TestCalculatePiotroskiScore_NoNewShares(t *testing.T) {
	tests := []struct {
		name           string
		currentShares  int64
		previousShares int64
		want           bool
	}{
		{"shares decreased", 900, 1000, true},
		{"shares same", 1000, 1000, true},
		{"shares increased", 1100, 1000, false},
		{"no previous data", 1000, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			current := FinancialData{SharesOutstanding: tt.currentShares}
			previous := FinancialData{SharesOutstanding: tt.previousShares}
			result := CalculatePiotroskiScore(&current, &previous)

			if result.Breakdown.NoNewShares != tt.want {
				t.Errorf("NoNewShares = %v, want %v", result.Breakdown.NoNewShares, tt.want)
			}
		})
	}
}

func TestCalculatePiotroskiScore_ZeroScore(t *testing.T) {
	// All negative/failing conditions
	current := FinancialData{
		NetIncome:          -100, // Negative -> PositiveNetIncome = false
		TotalAssets:        1000,
		OperatingCashFlow:  -200, // Negative -> PositiveOperatingCashFlow = false
		LongTermDebt:       600,  // Higher ratio than previous -> LowerLongTermDebt = false
		CurrentAssets:      500,
		CurrentLiabilities: 1000, // Lower current ratio -> HigherCurrentRatio = false
		SharesOutstanding:  1200, // More shares -> NoNewShares = false
		GrossProfit:        200,  // Lower margin than previous -> HigherGrossMargin = false
		Revenue:            1000, // Same asset turnover -> HigherAssetTurnover = false
	}

	previous := FinancialData{
		TotalAssets:        1000,
		LongTermDebt:       500,
		CurrentAssets:      600,
		CurrentLiabilities: 1000,
		SharesOutstanding:  1000,
		GrossProfit:        300,
		Revenue:            1000,
	}

	result := CalculatePiotroskiScore(&current, &previous)

	// Note: CashFlowGreaterThanNetIncome will be true (-200 > -100 is false)
	// Actually: -200 > -100 is false, so this should be false
	// Let me check: -200 is less than -100, so -200 > -100 = false. Good.

	if result.Score != 0 {
		t.Errorf("expected score 0, got %d", result.Score)
		t.Logf("Breakdown: %+v", result.Breakdown)
	}
}

func TestCalculatePiotroskiScore_PartialScore(t *testing.T) {
	// Test with some passing, some failing
	current := FinancialData{
		NetIncome:          100,  // Pass
		TotalAssets:        1000, // Pass (positive ROA)
		OperatingCashFlow:  150,  // Pass (positive) and Pass (> net income)
		LongTermDebt:       500,
		CurrentAssets:      500,
		CurrentLiabilities: 500,
		SharesOutstanding:  1000,
		GrossProfit:        200,
		Revenue:            1000,
	}

	previous := FinancialData{
		TotalAssets:        1000,
		LongTermDebt:       500, // Same ratio -> fail
		CurrentAssets:      500,
		CurrentLiabilities: 500,  // Same ratio -> fail
		SharesOutstanding:  1000, // Same shares -> pass
		GrossProfit:        200,  // Same margin -> fail
		Revenue:            1000, // Same turnover -> fail
	}

	result := CalculatePiotroskiScore(&current, &previous)

	// Expected passing:
	// 1. PositiveNetIncome: true
	// 2. PositiveROA: true
	// 3. PositiveOperatingCashFlow: true
	// 4. CashFlowGreaterThanNetIncome: true (150 > 100)
	// 5. LowerLongTermDebt: false (same)
	// 6. HigherCurrentRatio: false (same)
	// 7. NoNewShares: true (same)
	// 8. HigherGrossMargin: false (same)
	// 9. HigherAssetTurnover: false (same)
	// Total: 5

	if result.Score != 5 {
		t.Errorf("expected score 5, got %d", result.Score)
		t.Logf("Breakdown: %+v", result.Breakdown)
	}
}
