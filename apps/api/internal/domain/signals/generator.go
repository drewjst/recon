package signals

import (
	"sort"

	"github.com/drewjst/recon/apps/api/internal/domain/scores"
)

// Generator creates signals from various data sources.
type Generator struct {
	rules []Rule
}

// NewGenerator creates a new signal generator with default rules.
func NewGenerator() *Generator {
	return &Generator{
		rules: defaultRules(),
	}
}

// FinancialsData contains the financial metrics needed for signal generation.
type FinancialsData struct {
	RevenueGrowthYoY float64
	OperatingMargin  float64
	DebtToEquity     float64
	ROIC             float64
}

// InsiderActivityData contains insider trading metrics for signal generation.
type InsiderActivityData struct {
	BuyCount90d  int
	SellCount90d int
	NetValue90d  float64
}

// StockData contains all data needed for signal generation.
type StockData struct {
	Financials      *FinancialsData
	InsiderActivity *InsiderActivityData
}

// GenerateAll generates signals from all available data sources.
func (g *Generator) GenerateAll(
	data *StockData,
	piotroski scores.PiotroskiResult,
	altmanZ scores.AltmanZResult,
) []Signal {
	ctx := &RuleContext{
		Financials:      data.Financials,
		InsiderActivity: data.InsiderActivity,
		Piotroski:       piotroski,
		AltmanZ:         altmanZ,
	}

	var signals []Signal
	for _, rule := range g.rules {
		if signal := rule.Evaluate(ctx); signal != nil {
			signals = append(signals, *signal)
		}
	}

	// Sort by priority (highest first)
	sort.Slice(signals, func(i, j int) bool {
		return signals[i].Priority > signals[j].Priority
	})

	return signals
}

// RuleContext contains all data available for signal generation.
type RuleContext struct {
	Financials      *FinancialsData
	InsiderActivity *InsiderActivityData
	Piotroski       scores.PiotroskiResult
	AltmanZ         scores.AltmanZResult
}

// Rule defines the interface for signal generation rules.
type Rule interface {
	Evaluate(ctx *RuleContext) *Signal
}
