package signals

import (
	"fmt"
	"reflect"
)

// defaultRules returns the standard set of signal generation rules.
func defaultRules() []Rule {
	return []Rule{
		&HighPiotroskiRule{},
		&LowPiotroskiRule{},
		&AltmanDistressRule{},
		&AltmanSafeRule{},
		&InstitutionalAccumulationRule{},
		&InstitutionalDistributionRule{},
		&InsiderBuyingRule{},
		&InsiderSellingRule{},
		&HighGrowthRule{},
		&NegativeMarginsRule{},
		&HighDebtRule{},
		&StrongROICRule{},
	}
}

// HighPiotroskiRule generates a bullish signal for high Piotroski scores.
type HighPiotroskiRule struct{}

func (r *HighPiotroskiRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Piotroski.Score >= 7 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Strong Piotroski F-Score of %d indicates solid fundamentals", ctx.Piotroski.Score),
			Priority: 4,
			Data:     map[string]interface{}{"score": ctx.Piotroski.Score},
		}
	}
	return nil
}

// LowPiotroskiRule generates a bearish signal for low Piotroski scores.
type LowPiotroskiRule struct{}

func (r *LowPiotroskiRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Piotroski.Score <= 3 {
		return &Signal{
			Type:     SignalBearish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Weak Piotroski F-Score of %d suggests fundamental concerns", ctx.Piotroski.Score),
			Priority: 4,
			Data:     map[string]interface{}{"score": ctx.Piotroski.Score},
		}
	}
	return nil
}

// AltmanDistressRule generates a warning for companies in distress zone.
type AltmanDistressRule struct{}

func (r *AltmanDistressRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.AltmanZ.Zone == "distress" {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Altman Z-Score of %.2f indicates elevated bankruptcy risk", ctx.AltmanZ.Score),
			Priority: 5,
			Data:     map[string]interface{}{"score": ctx.AltmanZ.Score, "zone": ctx.AltmanZ.Zone},
		}
	}
	return nil
}

// AltmanSafeRule generates a bullish signal for companies in safe zone.
type AltmanSafeRule struct{}

func (r *AltmanSafeRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.AltmanZ.Zone == "safe" && ctx.AltmanZ.Score > 4.0 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Strong Altman Z-Score of %.2f indicates excellent financial health", ctx.AltmanZ.Score),
			Priority: 3,
			Data:     map[string]interface{}{"score": ctx.AltmanZ.Score},
		}
	}
	return nil
}

// financialsData is a helper struct for financials.
type financialsData struct {
	RevenueGrowthYoY float64
	OperatingMargin  float64
	DebtToEquity     float64
	ROIC             float64
}

// getFloat64Field extracts a float64 field from a struct using reflection.
func getFloat64Field(v reflect.Value, name string) float64 {
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return 0
	}
	field := v.FieldByName(name)
	if !field.IsValid() || field.Kind() != reflect.Float64 {
		return 0
	}
	return field.Float()
}

// getIntField extracts an int field from a struct using reflection.
func getIntField(v reflect.Value, name string) int {
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return 0
	}
	field := v.FieldByName(name)
	if !field.IsValid() || field.Kind() != reflect.Int {
		return 0
	}
	return int(field.Int())
}

func getFinancialsData(f interface{}) *financialsData {
	if f == nil {
		return nil
	}
	v := reflect.ValueOf(f)
	if v.Kind() == reflect.Ptr && v.IsNil() {
		return nil
	}
	return &financialsData{
		RevenueGrowthYoY: getFloat64Field(v, "RevenueGrowthYoY"),
		OperatingMargin:  getFloat64Field(v, "OperatingMargin"),
		DebtToEquity:     getFloat64Field(v, "DebtToEquity"),
		ROIC:             getFloat64Field(v, "ROIC"),
	}
}

// insiderActivityData is a helper struct for insider activity.
type insiderActivityData struct {
	BuyCount90d  int
	SellCount90d int
	NetValue90d  float64
}

func getInsiderActivityData(i interface{}) *insiderActivityData {
	if i == nil {
		return nil
	}
	v := reflect.ValueOf(i)
	if v.Kind() == reflect.Ptr && v.IsNil() {
		return nil
	}
	buyCount := getIntField(v, "BuyCount90d")
	sellCount := getIntField(v, "SellCount90d")
	netValue := getFloat64Field(v, "NetValue90d")
	// Only return if we got at least some data
	if buyCount == 0 && sellCount == 0 && netValue == 0 {
		return nil
	}
	return &insiderActivityData{
		BuyCount90d:  buyCount,
		SellCount90d: sellCount,
		NetValue90d:  netValue,
	}
}

// InstitutionalAccumulationRule detects institutional buying patterns.
type InstitutionalAccumulationRule struct{}

func (r *InstitutionalAccumulationRule) Evaluate(ctx *RuleContext) *Signal {
	// Holdings data not reliably available in current API
	return nil
}

// InstitutionalDistributionRule detects institutional selling patterns.
type InstitutionalDistributionRule struct{}

func (r *InstitutionalDistributionRule) Evaluate(ctx *RuleContext) *Signal {
	// Holdings data not reliably available in current API
	return nil
}

// InsiderBuyingRule detects significant insider buying activity.
type InsiderBuyingRule struct{}

func (r *InsiderBuyingRule) Evaluate(ctx *RuleContext) *Signal {
	data := getInsiderActivityData(ctx.InsiderTrades)
	if data == nil {
		return nil
	}
	// Bullish if net buying and multiple buys
	if data.BuyCount90d >= 3 && data.NetValue90d > 100000 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryInsider,
			Message:  fmt.Sprintf("Strong insider buying: %d buys totaling $%.0fK net in 90 days", data.BuyCount90d, data.NetValue90d/1000),
			Priority: 4,
			Data:     map[string]interface{}{"buyCount": data.BuyCount90d, "netValue": data.NetValue90d},
		}
	}
	return nil
}

// InsiderSellingRule detects significant insider selling activity.
type InsiderSellingRule struct{}

func (r *InsiderSellingRule) Evaluate(ctx *RuleContext) *Signal {
	data := getInsiderActivityData(ctx.InsiderTrades)
	if data == nil {
		return nil
	}
	// Warning if heavy selling
	if data.SellCount90d >= 5 && data.NetValue90d < -500000 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryInsider,
			Message:  fmt.Sprintf("Heavy insider selling: %d sells totaling $%.0fM net in 90 days", data.SellCount90d, data.NetValue90d/1000000),
			Priority: 3,
			Data:     map[string]interface{}{"sellCount": data.SellCount90d, "netValue": data.NetValue90d},
		}
	}
	return nil
}

// HighGrowthRule detects strong revenue growth.
type HighGrowthRule struct{}

func (r *HighGrowthRule) Evaluate(ctx *RuleContext) *Signal {
	data := getFinancialsData(ctx.Financials)
	if data == nil {
		return nil
	}
	// Strong growth > 20% YoY
	if data.RevenueGrowthYoY > 20 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Strong revenue growth of %.1f%% YoY", data.RevenueGrowthYoY),
			Priority: 3,
			Data:     map[string]interface{}{"growth": data.RevenueGrowthYoY},
		}
	}
	return nil
}

// NegativeMarginsRule warns about negative operating margins.
type NegativeMarginsRule struct{}

func (r *NegativeMarginsRule) Evaluate(ctx *RuleContext) *Signal {
	data := getFinancialsData(ctx.Financials)
	if data == nil {
		return nil
	}
	// Warning if operating margin is negative
	if data.OperatingMargin < 0 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Negative operating margin of %.1f%% indicates unprofitable operations", data.OperatingMargin),
			Priority: 4,
			Data:     map[string]interface{}{"margin": data.OperatingMargin},
		}
	}
	return nil
}

// HighDebtRule warns about elevated debt levels.
type HighDebtRule struct{}

func (r *HighDebtRule) Evaluate(ctx *RuleContext) *Signal {
	data := getFinancialsData(ctx.Financials)
	if data == nil {
		return nil
	}
	// Warning if D/E > 2.0 (high leverage)
	if data.DebtToEquity > 2.0 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("High debt-to-equity ratio of %.2f indicates elevated leverage", data.DebtToEquity),
			Priority: 3,
			Data:     map[string]interface{}{"debtToEquity": data.DebtToEquity},
		}
	}
	return nil
}

// StrongROICRule detects strong return on invested capital.
type StrongROICRule struct{}

func (r *StrongROICRule) Evaluate(ctx *RuleContext) *Signal {
	data := getFinancialsData(ctx.Financials)
	if data == nil {
		return nil
	}
	// Bullish if ROIC > 20% (strong capital efficiency)
	if data.ROIC > 20 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Excellent ROIC of %.1f%% shows strong capital efficiency", data.ROIC),
			Priority: 3,
			Data:     map[string]interface{}{"roic": data.ROIC},
		}
	}
	return nil
}
