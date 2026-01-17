package signals

import (
	"testing"

	"github.com/drewjst/recon/apps/api/internal/domain/scores"
)

func TestGenerator_HighPiotroskiScore(t *testing.T) {
	gen := NewGenerator()

	signals := gen.GenerateAll(
		&StockData{},
		scores.PiotroskiResult{Score: 8},
		scores.AltmanZResult{Zone: "safe", Score: 3.5},
	)

	found := false
	for _, s := range signals {
		if s.Category == CategoryFundamental && s.Type == SignalBullish {
			if s.Data["score"] == 8 {
				found = true
				break
			}
		}
	}

	if !found {
		t.Error("expected bullish signal for high Piotroski score")
	}
}

func TestGenerator_LowPiotroskiScore(t *testing.T) {
	gen := NewGenerator()

	signals := gen.GenerateAll(
		&StockData{},
		scores.PiotroskiResult{Score: 2},
		scores.AltmanZResult{Zone: "gray", Score: 2.0},
	)

	found := false
	for _, s := range signals {
		if s.Category == CategoryFundamental && s.Type == SignalBearish {
			if s.Data["score"] == 2 {
				found = true
				break
			}
		}
	}

	if !found {
		t.Error("expected bearish signal for low Piotroski score")
	}
}

func TestGenerator_AltmanDistress(t *testing.T) {
	gen := NewGenerator()

	signals := gen.GenerateAll(
		&StockData{},
		scores.PiotroskiResult{Score: 5},
		scores.AltmanZResult{Zone: "distress", Score: 1.2},
	)

	found := false
	for _, s := range signals {
		if s.Type == SignalWarning && s.Data["zone"] == "distress" {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected warning signal for Altman distress zone")
	}
}

func TestGenerator_SignalPrioritySorting(t *testing.T) {
	gen := NewGenerator()

	// Create context that will generate multiple signals
	signals := gen.GenerateAll(
		&StockData{},
		scores.PiotroskiResult{Score: 8},               // High score (priority 4)
		scores.AltmanZResult{Zone: "safe", Score: 4.5}, // Safe zone (priority 3)
	)

	// Verify signals are sorted by priority (highest first)
	for i := 1; i < len(signals); i++ {
		if signals[i].Priority > signals[i-1].Priority {
			t.Errorf("signals not sorted by priority: signal %d has priority %d, signal %d has priority %d",
				i-1, signals[i-1].Priority, i, signals[i].Priority)
		}
	}
}

func TestGenerator_FinancialsSignals(t *testing.T) {
	gen := NewGenerator()

	// Test high growth signal
	signals := gen.GenerateAll(
		&StockData{
			Financials: &FinancialsData{
				RevenueGrowthYoY: 25.0,
				OperatingMargin:  15.0,
				DebtToEquity:     0.5,
				ROIC:             25.0,
			},
		},
		scores.PiotroskiResult{Score: 5},
		scores.AltmanZResult{Zone: "safe", Score: 3.0},
	)

	// Should have high growth and strong ROIC signals
	hasGrowth := false
	hasROIC := false
	for _, s := range signals {
		if s.Data["growth"] == 25.0 {
			hasGrowth = true
		}
		if s.Data["roic"] == 25.0 {
			hasROIC = true
		}
	}

	if !hasGrowth {
		t.Error("expected growth signal for 25% revenue growth")
	}
	if !hasROIC {
		t.Error("expected ROIC signal for 25% ROIC")
	}
}

func TestGenerator_InsiderActivity(t *testing.T) {
	gen := NewGenerator()

	// Test insider buying signal
	signals := gen.GenerateAll(
		&StockData{
			InsiderActivity: &InsiderActivityData{
				BuyCount90d:  5,
				SellCount90d: 1,
				NetValue90d:  200000,
			},
		},
		scores.PiotroskiResult{Score: 5},
		scores.AltmanZResult{Zone: "safe", Score: 3.0},
	)

	found := false
	for _, s := range signals {
		if s.Category == CategoryInsider && s.Type == SignalBullish {
			found = true
			break
		}
	}

	if !found {
		t.Error("expected bullish signal for insider buying")
	}
}
