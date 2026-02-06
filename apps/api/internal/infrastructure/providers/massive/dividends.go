package massive

import (
	"context"
	"fmt"
	"strings"
)

// GetDividends fetches recent cash dividend distributions for a ticker,
// sorted by ex-dividend date descending (most recent first).
// Returns nil, nil if no dividends are found.
func (c *Client) GetDividends(ctx context.Context, ticker string) ([]Dividend, error) {
	upper := strings.ToUpper(ticker)

	path := fmt.Sprintf("/stocks/v1/dividends?ticker=%s&limit=20&sort=ex_dividend_date&order=desc", upper)
	url := c.appendKey(c.buildURL(path))

	var resp dividendResponse
	if err := c.get(ctx, url, &resp); err != nil {
		if IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching dividends for %s: %w", ticker, err)
	}

	if len(resp.Results) == 0 {
		return nil, nil
	}

	divs := make([]Dividend, len(resp.Results))
	for i, w := range resp.Results {
		divs[i] = Dividend{
			Ticker:     w.Ticker,
			CashAmount: w.CashAmount,
			Currency:   w.Currency,
			ExDate:     w.ExDividendDate,
			PayDate:    w.PayDate,
			RecordDate: w.RecordDate,
			Frequency:  w.Frequency,
			Type:       w.Type,
		}
	}

	return divs, nil
}
