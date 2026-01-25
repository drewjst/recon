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
	Price       float64

	// Valuation
	PE              float64
	ForwardPE       float64
	EVToEBITDA      float64
	PS              float64
	PFCF            float64
	PEG             float64
	AvgPE           float64 // 5Y average
	SectorPE        float64
	PEPercentile    int     // Current P/E percentile vs 5Y history
	EPSGrowth       float64 // Estimated EPS growth %
	TargetPrice     float64
	Upside          float64 // % upside/downside to target
	UpsideDirection string  // "upside" or "downside"

	// Growth (future)
	RevGrowthTTM float64
	EPSGrowthTTM float64
	RevCAGR3Y    float64
	GrossMargin  float64
	OpMargin     float64
	ROIC         float64
	RuleOf40     float64
	BeatRate     float64
	AvgSurprise  float64

	// Smart Money (future)
	InstOwnership  float64
	InstChangeQoQ  float64
	InsiderNetBuys int
	InsiderNetValue string

	// Risk (future)
	AltmanZ       float64
	AltmanZRating string
	Piotroski     int
	DebtEquity    float64
	ShortInterest float64
	Beta          float64

	// Earnings (future)
	Quarter           int
	Year              int
	Revenue           string
	EPS               string
	RevVsEst          float64
	EPSVsEst          float64
	TranscriptSummary string
}

var promptTemplates = map[models.InsightSection]string{
	models.InsightSectionValuationSummary: `You are Crux.AI, a concise equity analyst. Provide a brief valuation summary.

STOCK: {{.Ticker}} ({{.CompanyName}})
SECTOR: {{.Sector}}

VALUATION METRICS:
- P/E (TTM): {{printf "%.1f" .PE}}x | 5Y Avg: {{printf "%.1f" .AvgPE}}x | Sector: {{printf "%.1f" .SectorPE}}x
- Forward P/E: {{printf "%.1f" .ForwardPE}}x
- EV/EBITDA: {{printf "%.1f" .EVToEBITDA}}x
- PEG Ratio: {{printf "%.2f" .PEG}}x (EPS Growth Est: {{printf "%.1f" .EPSGrowth}}%)
- P/FCF: {{printf "%.1f" .PFCF}}x

CONTEXT:
- Current Price: ${{printf "%.2f" .Price}}
- Analyst Target: ${{printf "%.2f" .TargetPrice}} ({{printf "%.1f" .Upside}}% {{.UpsideDirection}})
- 5Y P/E Percentile: {{.PEPercentile}}th

In 2-3 sentences:
1. State whether valuation is expensive/fair/cheap with specific context
2. What the market appears to be pricing in
3. The key risk or opportunity

Be direct and specific. No generic statements.`,
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
