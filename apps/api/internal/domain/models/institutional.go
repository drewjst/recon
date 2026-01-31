package models

// InstitutionalDetail contains comprehensive institutional ownership data for the deep dive page.
type InstitutionalDetail struct {
	Ticker string `json:"ticker"`

	// Ownership overview
	OwnershipPercent       float64 `json:"ownershipPercent"`
	OwnershipPercentChange float64 `json:"ownershipPercentChange"`
	TotalHolders           int     `json:"totalHolders"`
	HoldersIncreased       int     `json:"holdersIncreased"`
	HoldersDecreased       int     `json:"holdersDecreased"`
	HoldersNew             int     `json:"holdersNew"`
	HoldersClosed          int     `json:"holdersClosed"`

	// Historical ownership trend (2 years of quarterly data)
	OwnershipHistory []OwnershipHistoryPoint `json:"ownershipHistory"`

	// Holder type breakdown
	HolderTypeBreakdown []HolderTypeBreakdown `json:"holderTypeBreakdown"`

	// Top 10 holders
	TopHolders []InstitutionalHolderDetail `json:"topHolders"`

	// Recent activity
	NewPositions      []InstitutionalHolderDetail `json:"newPositions"`
	ClosedPositions   []InstitutionalHolderDetail `json:"closedPositions"`
	BiggestIncreases  []InstitutionalHolderDetail `json:"biggestIncreases"`
	BiggestDecreases  []InstitutionalHolderDetail `json:"biggestDecreases"`

	// Signals
	Signals []InstitutionalSignal `json:"signals"`
}

// OwnershipHistoryPoint represents a single quarter's ownership data.
type OwnershipHistoryPoint struct {
	Date             string  `json:"date"` // "2024-Q4" format
	Year             int     `json:"year"`
	Quarter          int     `json:"quarter"`
	OwnershipPercent float64 `json:"ownershipPercent"`
	HolderCount      int     `json:"holderCount"`
	TotalShares      int64   `json:"totalShares"`
}

// HolderTypeBreakdown represents ownership by holder type.
type HolderTypeBreakdown struct {
	HolderType       string  `json:"holderType"` // "Investment Advisor", "Hedge Fund", etc.
	InvestorCount    int     `json:"investorCount"`
	OwnershipPercent float64 `json:"ownershipPercent"`
	TotalShares      int64   `json:"totalShares"`
	TotalValue       int64   `json:"totalValue"`
	SharesChange     int64   `json:"sharesChange"`
	ChangePercent    float64 `json:"changePercent"`
}

// InstitutionalHolderDetail represents a single institutional holder with full details.
type InstitutionalHolderDetail struct {
	Rank          int     `json:"rank,omitempty"`
	Name          string  `json:"name"`
	CIK           string  `json:"cik,omitempty"`
	Shares        int64   `json:"shares"`
	Value         int64   `json:"value"`
	PercentOwned  float64 `json:"percentOwned"`
	ChangeShares  int64   `json:"changeShares"`
	ChangePercent float64 `json:"changePercent"`
	IsNew         bool    `json:"isNew"`
	IsSoldOut     bool    `json:"isSoldOut"`
	DateReported  string  `json:"dateReported,omitempty"`
}

// InstitutionalSignal represents a signal about institutional activity.
type InstitutionalSignal struct {
	Type        string `json:"type"`        // "bullish", "bearish", "neutral"
	Title       string `json:"title"`
	Description string `json:"description"`
}
