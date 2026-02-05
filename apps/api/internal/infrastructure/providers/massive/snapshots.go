package massive

import (
	"context"
	"fmt"
	"strings"
	"sync"
)

const maxTickersPerBatch = 50

// GetSnapshot fetches a real-time quote snapshot for a single ticker.
// Returns nil, nil if the ticker is not found.
func (c *Client) GetSnapshot(ctx context.Context, ticker string) (*TickerSnapshot, error) {
	path := fmt.Sprintf("/v2/snapshot/locale/us/markets/stocks/tickers/%s", strings.ToUpper(ticker))
	url := c.appendKey(c.buildURL(path))

	var resp singleSnapshotResponse
	if err := c.get(ctx, url, &resp); err != nil {
		if IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching snapshot for %s: %w", ticker, err)
	}

	return mapSnapshot(&resp.Ticker), nil
}

// GetBatchSnapshots fetches real-time quote snapshots for multiple tickers.
// Batches requests in groups of 50 and runs batches in parallel.
// Tickers not found are silently omitted from the result map.
func (c *Client) GetBatchSnapshots(ctx context.Context, tickers []string) (map[string]*TickerSnapshot, error) {
	if len(tickers) == 0 {
		return nil, nil
	}

	// Normalize tickers
	upper := make([]string, len(tickers))
	for i, t := range tickers {
		upper[i] = strings.ToUpper(t)
	}

	// Split into batches of maxTickersPerBatch
	batches := splitBatches(upper, maxTickersPerBatch)

	result := make(map[string]*TickerSnapshot, len(tickers))
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	for _, batch := range batches {
		wg.Add(1)
		go func(batch []string) {
			defer wg.Done()

			snapshots, err := c.fetchBatch(ctx, batch)
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}

			mu.Lock()
			for k, v := range snapshots {
				result[k] = v
			}
			mu.Unlock()
		}(batch)
	}

	wg.Wait()

	if firstErr != nil {
		return nil, firstErr
	}

	return result, nil
}

// fetchBatch fetches snapshots for a single batch of tickers (up to 50).
func (c *Client) fetchBatch(ctx context.Context, tickers []string) (map[string]*TickerSnapshot, error) {
	joined := strings.Join(tickers, ",")
	path := fmt.Sprintf("/v2/snapshot/locale/us/markets/stocks/tickers?tickers=%s", joined)
	url := c.appendKey(c.buildURL(path))

	var resp snapshotResponse
	if err := c.get(ctx, url, &resp); err != nil {
		if IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching batch snapshots: %w", err)
	}

	result := make(map[string]*TickerSnapshot, len(resp.Tickers))
	for i := range resp.Tickers {
		s := mapSnapshot(&resp.Tickers[i])
		result[s.Ticker] = s
	}

	return result, nil
}

// splitBatches divides a slice into chunks of the given size.
func splitBatches(items []string, size int) [][]string {
	var batches [][]string
	for i := 0; i < len(items); i += size {
		end := i + size
		if end > len(items) {
			end = len(items)
		}
		batches = append(batches, items[i:end])
	}
	return batches
}

// mapSnapshot converts a wire snapshot to a domain TickerSnapshot.
func mapSnapshot(w *snapshotTicker) *TickerSnapshot {
	return &TickerSnapshot{
		Ticker:              w.Ticker,
		Day:                 mapOHLCV(&w.Day),
		PrevDay:             mapOHLCV(&w.PrevDay),
		Min:                 mapOHLCV(&w.Min),
		TodaysChange:        w.TodaysChange,
		TodaysChangePercent: w.TodaysChangePercent,
		Updated:             w.Updated,
	}
}

// mapOHLCV converts wire OHLC data to the domain OHLCV type.
func mapOHLCV(w *snapshotOHLC) OHLCV {
	return OHLCV{
		Open:   w.O,
		High:   w.H,
		Low:    w.L,
		Close:  w.C,
		Volume: w.V,
		VWAP:   w.VW,
	}
}

