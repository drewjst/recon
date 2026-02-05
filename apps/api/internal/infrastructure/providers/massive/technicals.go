package massive

import (
	"context"
	"fmt"
	"strings"
	"sync"
)

// GetSMA fetches the most recent Simple Moving Average for a ticker and window.
// Returns nil, nil if the ticker is not found or no data is available.
func (c *Client) GetSMA(ctx context.Context, ticker string, window int) (*IndicatorResult, error) {
	return c.getIndicator(ctx, "sma", ticker, window)
}

// GetRSI fetches the most recent Relative Strength Index for a ticker and window.
// Returns nil, nil if the ticker is not found or no data is available.
func (c *Client) GetRSI(ctx context.Context, ticker string, window int) (*IndicatorResult, error) {
	return c.getIndicator(ctx, "rsi", ticker, window)
}

// getIndicator fetches a single technical indicator value.
func (c *Client) getIndicator(ctx context.Context, indicator, ticker string, window int) (*IndicatorResult, error) {
	upper := strings.ToUpper(ticker)
	path := fmt.Sprintf(
		"/v1/indicators/%s/%s?timespan=day&window=%d&series_type=close&order=desc&limit=1",
		indicator, upper, window,
	)
	url := c.appendKey(c.buildURL(path))

	var resp indicatorResponse
	if err := c.get(ctx, url, &resp); err != nil {
		if IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching %s(%d) for %s: %w", indicator, window, ticker, err)
	}

	if len(resp.Results.Values) == 0 {
		return nil, nil
	}

	v := resp.Results.Values[0]
	return &IndicatorResult{
		Value:     v.Value,
		Timestamp: v.Timestamp,
	}, nil
}

// GetTechnicals fetches SMA(20, 50, 200) and RSI(14) in parallel and returns
// a consolidated TechnicalIndicators struct. Individual indicator failures are
// logged but do not fail the entire call — missing values default to zero.
func (c *Client) GetTechnicals(ctx context.Context, ticker string, currentPrice float64) (*TechnicalIndicators, error) {
	type smaResult struct {
		window int
		result *IndicatorResult
		err    error
	}

	var (
		wg         sync.WaitGroup
		smaCh      = make(chan smaResult, 3)
		rsiResult  *IndicatorResult
		rsiErr     error
		rsiDone    = make(chan struct{})
	)

	// Fetch SMA 20, 50, 200 in parallel
	for _, w := range []int{20, 50, 200} {
		wg.Add(1)
		go func(window int) {
			defer wg.Done()
			r, err := c.GetSMA(ctx, ticker, window)
			smaCh <- smaResult{window: window, result: r, err: err}
		}(w)
	}

	// Fetch RSI 14 in parallel
	go func() {
		rsiResult, rsiErr = c.GetRSI(ctx, ticker, 14)
		close(rsiDone)
	}()

	// Wait for all SMA goroutines and close channel
	go func() {
		wg.Wait()
		close(smaCh)
	}()

	// Collect SMA results
	ti := &TechnicalIndicators{}
	for sr := range smaCh {
		if sr.err != nil {
			// Non-fatal: log and continue with zero value
			continue
		}
		if sr.result == nil {
			continue
		}
		switch sr.window {
		case 20:
			ti.SMA20 = sr.result.Value
		case 50:
			ti.SMA50 = sr.result.Value
		case 200:
			ti.SMA200 = sr.result.Value
		}
	}

	// Collect RSI result
	<-rsiDone
	if rsiErr == nil && rsiResult != nil {
		ti.RSI14 = rsiResult.Value
	}

	// Compute above/below signals
	if ti.SMA20 > 0 {
		ti.Above20 = currentPrice > ti.SMA20
	}
	if ti.SMA50 > 0 {
		ti.Above50 = currentPrice > ti.SMA50
	}
	if ti.SMA200 > 0 {
		ti.Above200 = currentPrice > ti.SMA200
	}

	return ti, nil
}
