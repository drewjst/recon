package ai

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
)

// PromptData contains all possible fields for insight prompts.
// Add new fields as sections are added - unused fields are ignored by templates.
type PromptData struct {
	// Common
	Ticker      string
	CompanyName string
	Sector      string
	Industry    string
	Price       float64
	MarketCap   string // Formatted (e.g., "$2.5T")

	// Valuation Multiples
	PE         float64
	ForwardPE  float64
	EVToEBITDA float64
	PS         float64
	PFCF       float64
	PB         float64
	PEG        float64

	// Historical Context
	AvgPE        float64 // 5Y average
	SectorPE     float64
	IndustryPE   float64
	PEPercentile int // Current P/E percentile vs 5Y history

	// DCF & Intrinsic Value
	DCFValue       float64
	DCFUpside      float64 // % difference from current price
	DCFDirection   string  // "undervalued" or "overvalued"
	OwnerEarnings  float64
	OwnerEarningsYield float64

	// Growth & Profitability
	EPSGrowth       float64 // Estimated EPS growth %
	RevenueGrowth   float64 // YoY revenue growth
	GrossMargin     float64
	OperatingMargin float64
	NetMargin       float64
	ROE             float64
	ROIC            float64
	FCFMargin       float64

	// Analyst Estimates
	TargetPrice     float64
	Upside          float64 // % upside/downside to target
	UpsideDirection string  // "upside" or "downside"
	AnalystRating   string  // "Strong Buy", "Buy", "Hold", etc.
	AnalystCount    int

	// Quality & Risk
	DebtToEquity  float64
	CurrentRatio  float64
	Piotroski     int
	AltmanZ       float64
	AltmanZRating string

	// Future section fields (Growth, Smart Money, Earnings)
	RevGrowthTTM    float64
	EPSGrowthTTM    float64
	RevCAGR3Y       float64
	RuleOf40        float64
	BeatRate        float64
	AvgSurprise     float64
	InstOwnership   float64
	InstChangeQoQ   float64
	InsiderNetBuys  int
	InsiderNetValue string
	ShortInterest   float64
	Beta            float64
	Quarter         int
	Year            int
	Revenue         string
	EPS             string
	RevVsEst        float64
	EPSVsEst        float64
}

var promptTemplates = map[models.InsightSection]string{
	models.InsightSectionValuationSummary: `You are a concise equity analyst providing a valuation summary. Be specific and data-driven.

COMPANY: {{.Ticker}} - {{.CompanyName}}
SECTOR: {{.Sector}}{{if .Industry}} | INDUSTRY: {{.Industry}}{{end}}
PRICE: ${{printf "%.2f" .Price}}{{if .MarketCap}} | MARKET CAP: {{.MarketCap}}{{end}}

═══════════════════════════════════════════════════════════════════
VALUATION MULTIPLES
═══════════════════════════════════════════════════════════════════
                    Current     5Y Avg      Sector
P/E (TTM)           {{printf "%6.1f" .PE}}x      {{printf "%6.1f" .AvgPE}}x      {{printf "%6.1f" .SectorPE}}x
Forward P/E         {{printf "%6.1f" .ForwardPE}}x
EV/EBITDA           {{printf "%6.1f" .EVToEBITDA}}x
P/FCF               {{printf "%6.1f" .PFCF}}x
P/S                 {{printf "%6.1f" .PS}}x
PEG                 {{printf "%6.2f" .PEG}}x      (EPS Growth Est: {{printf "%.0f" .EPSGrowth}}%)

Historical Rank: {{.PEPercentile}}th percentile vs 5-year range
{{if gt .DCFValue 0}}
═══════════════════════════════════════════════════════════════════
INTRINSIC VALUE ESTIMATE
═══════════════════════════════════════════════════════════════════
DCF Fair Value: ${{printf "%.2f" .DCFValue}} → {{printf "%.0f" .DCFUpside}}% {{.DCFDirection}} vs current price
{{end}}
═══════════════════════════════════════════════════════════════════
PROFITABILITY & GROWTH
═══════════════════════════════════════════════════════════════════
Gross Margin: {{printf "%.1f" .GrossMargin}}% | Operating Margin: {{printf "%.1f" .OperatingMargin}}% | Net Margin: {{printf "%.1f" .NetMargin}}%
ROE: {{printf "%.1f" .ROE}}% | ROIC: {{printf "%.1f" .ROIC}}%
Revenue Growth (YoY): {{printf "%.1f" .RevenueGrowth}}%
{{if gt .TargetPrice 0}}
═══════════════════════════════════════════════════════════════════
ANALYST CONSENSUS
═══════════════════════════════════════════════════════════════════
Rating: {{.AnalystRating}} ({{.AnalystCount}} analysts)
Price Target: ${{printf "%.2f" .TargetPrice}} → {{printf "%.0f" .Upside}}% {{.UpsideDirection}}
{{end}}
═══════════════════════════════════════════════════════════════════

TASK: Write a 3-4 sentence valuation summary that:
1. States whether the stock appears expensive, fairly valued, or cheap - with specific numbers as evidence
2. Explains what growth or quality factors might justify or contradict the current valuation
3. Identifies the key risk if buying at current prices OR the key opportunity if the market is mispricing

Be direct, specific, and actionable. Avoid generic statements. Reference specific metrics.`,
}

// BuildPrompt constructs a prompt for the given section using the provided data.
func BuildPrompt(section models.InsightSection, data PromptData) (string, error) {
	tmplStr, ok := promptTemplates[section]
	if !ok {
		return "", fmt.Errorf("no prompt template for section: %s", section)
	}

	tmpl, err := template.New(string(section)).Parse(tmplStr)
	if err != nil {
		return "", fmt.Errorf("parsing template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("executing template: %w", err)
	}

	return buf.String(), nil
}

// RegisterPrompt allows adding new prompt templates at runtime (useful for testing).
func RegisterPrompt(section models.InsightSection, tmpl string) {
	promptTemplates[section] = tmpl
}

// HasPrompt checks if a prompt template exists for the given section.
func HasPrompt(section models.InsightSection) bool {
	_, ok := promptTemplates[section]
	return ok
}
