package signals

import (
	"fmt"
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
	if ctx.InsiderActivity == nil {
		return nil
	}
	// Bullish if net buying and multiple buys
	if ctx.InsiderActivity.BuyCount90d >= 3 && ctx.InsiderActivity.NetValue90d > 100000 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryInsider,
			Message:  fmt.Sprintf("Strong insider buying: %d buys totaling $%.0fK net in 90 days", ctx.InsiderActivity.BuyCount90d, ctx.InsiderActivity.NetValue90d/1000),
			Priority: 4,
			Data:     map[string]interface{}{"buyCount": ctx.InsiderActivity.BuyCount90d, "netValue": ctx.InsiderActivity.NetValue90d},
		}
	}
	return nil
}

// InsiderSellingRule detects significant insider selling activity.
type InsiderSellingRule struct{}

func (r *InsiderSellingRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.InsiderActivity == nil {
		return nil
	}
	// Warning if heavy selling
	if ctx.InsiderActivity.SellCount90d >= 5 && ctx.InsiderActivity.NetValue90d < -500000 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryInsider,
			Message:  fmt.Sprintf("Heavy insider selling: %d sells totaling $%.0fM net in 90 days", ctx.InsiderActivity.SellCount90d, ctx.InsiderActivity.NetValue90d/1000000),
			Priority: 3,
			Data:     map[string]interface{}{"sellCount": ctx.InsiderActivity.SellCount90d, "netValue": ctx.InsiderActivity.NetValue90d},
		}
	}
	return nil
}

// HighGrowthRule detects strong revenue growth.
type HighGrowthRule struct{}

func (r *HighGrowthRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Financials == nil {
		return nil
	}
	// Strong growth > 20% YoY
	if ctx.Financials.RevenueGrowthYoY > 20 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Strong revenue growth of %.1f%% YoY", ctx.Financials.RevenueGrowthYoY),
			Priority: 3,
			Data:     map[string]interface{}{"growth": ctx.Financials.RevenueGrowthYoY},
		}
	}
	return nil
}

// NegativeMarginsRule warns about negative operating margins.
type NegativeMarginsRule struct{}

func (r *NegativeMarginsRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Financials == nil {
		return nil
	}
	// Warning if operating margin is negative
	if ctx.Financials.OperatingMargin < 0 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Negative operating margin of %.1f%% indicates unprofitable operations", ctx.Financials.OperatingMargin),
			Priority: 4,
			Data:     map[string]interface{}{"margin": ctx.Financials.OperatingMargin},
		}
	}
	return nil
}

// HighDebtRule warns about elevated debt levels.
type HighDebtRule struct{}

func (r *HighDebtRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Financials == nil {
		return nil
	}
	// Warning if D/E > 2.0 (high leverage)
	if ctx.Financials.DebtToEquity > 2.0 {
		return &Signal{
			Type:     SignalWarning,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("High debt-to-equity ratio of %.2f indicates elevated leverage", ctx.Financials.DebtToEquity),
			Priority: 3,
			Data:     map[string]interface{}{"debtToEquity": ctx.Financials.DebtToEquity},
		}
	}
	return nil
}

// StrongROICRule detects strong return on invested capital.
type StrongROICRule struct{}

func (r *StrongROICRule) Evaluate(ctx *RuleContext) *Signal {
	if ctx.Financials == nil {
		return nil
	}
	// Bullish if ROIC > 20% (strong capital efficiency)
	if ctx.Financials.ROIC > 20 {
		return &Signal{
			Type:     SignalBullish,
			Category: CategoryFundamental,
			Message:  fmt.Sprintf("Excellent ROIC of %.1f%% shows strong capital efficiency", ctx.Financials.ROIC),
			Priority: 3,
			Data:     map[string]interface{}{"roic": ctx.Financials.ROIC},
		}
	}
	return nil
}
