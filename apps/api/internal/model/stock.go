package model

import "time"

// Stock represents a stock with its fundamental data.
type Stock struct {
	ID        int64     `db:"id" json:"id"`
	Ticker    string    `db:"ticker" json:"ticker"`
	Name      string    `db:"name" json:"name"`
	Sector    string    `db:"sector" json:"sector"`
	Industry  string    `db:"industry" json:"industry"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// Fundamentals contains financial metrics for a stock.
type Fundamentals struct {
	StockID          int64     `db:"stock_id" json:"stockId"`
	FiscalYear       int       `db:"fiscal_year" json:"fiscalYear"`
	Revenue          float64   `db:"revenue" json:"revenue"`
	NetIncome        float64   `db:"net_income" json:"netIncome"`
	TotalAssets      float64   `db:"total_assets" json:"totalAssets"`
	TotalLiabilities float64   `db:"total_liabilities" json:"totalLiabilities"`
	OperatingCash    float64   `db:"operating_cash" json:"operatingCash"`
	SharesOut        int64     `db:"shares_outstanding" json:"sharesOutstanding"`
	UpdatedAt        time.Time `db:"updated_at" json:"updatedAt"`
}
