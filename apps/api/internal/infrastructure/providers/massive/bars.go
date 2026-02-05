package massive

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// GetDailyBars fetches adjusted daily OHLCV bars for a ticker over a date range.
// Returns nil, nil if the ticker is not found.
func (c *Client) GetDailyBars(ctx context.Context, ticker string, from, to time.Time) ([]Bar, error) {
	fromStr := from.Format("2006-01-02")
	toStr := to.Format("2006-01-02")
	upper := strings.ToUpper(ticker)

	path := fmt.Sprintf("/v2/aggs/ticker/%s/range/1/day/%s/%s?adjusted=true&sort=asc", upper, fromStr, toStr)
	url := c.appendKey(c.buildURL(path))

	var resp barsResponse
	if err := c.get(ctx, url, &resp); err != nil {
		if IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching daily bars for %s: %w", ticker, err)
	}

	bars := make([]Bar, len(resp.Results))
	for i, w := range resp.Results {
		bars[i] = Bar{
			Open:      w.O,
			High:      w.H,
			Low:       w.L,
			Close:     w.C,
			Volume:    w.V,
			VWAP:      w.VW,
			Timestamp: w.T,
			NumTrades: w.N,
		}
	}

	return bars, nil
}
