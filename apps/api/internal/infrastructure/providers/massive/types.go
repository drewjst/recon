// Package massive provides a client for the Polygon (Massive) API,
// focused on price data and technical indicators.
package massive

// TickerSnapshot represents real-time quote data for a single ticker.
type TickerSnapshot struct {
	Ticker              string
	Day                 OHLCV
	PrevDay             OHLCV
	TodaysChange        float64
	TodaysChangePercent float64
	Updated             int64 // Unix timestamp nanoseconds
	Min                 OHLCV // Current minute aggregate
}

// OHLCV represents Open/High/Low/Close/Volume price data.
type OHLCV struct {
	Open   float64
	High   float64
	Low    float64
	Close  float64
	Volume int64
	VWAP   float64
}

// Bar represents a single daily OHLCV bar.
type Bar struct {
	Open      float64
	High      float64
	Low       float64
	Close     float64
	Volume    int64
	VWAP      float64
	Timestamp int64 // Unix milliseconds
	NumTrades int64
}

// IndicatorResult represents a single technical indicator value.
type IndicatorResult struct {
	Value     float64
	Timestamp int64
}

// TechnicalIndicators holds a set of computed technical indicators for a ticker.
type TechnicalIndicators struct {
	SMA20    float64
	SMA50    float64
	SMA200   float64
	RSI14    float64
	Above20  bool
	Above50  bool
	Above200 bool
}

// --- Polygon wire types (JSON response shapes) ---

// polygonError is the standard Polygon error response.
type polygonError struct {
	Status    string `json:"status"`
	RequestID string `json:"request_id"`
	Error     string `json:"error"`
}

// snapshotResponse wraps the /v2/snapshot response for multiple tickers.
type snapshotResponse struct {
	Status  string             `json:"status"`
	Tickers []snapshotTicker   `json:"tickers"`
}

// singleSnapshotResponse wraps the /v2/snapshot response for a single ticker.
type singleSnapshotResponse struct {
	Status string         `json:"status"`
	Ticker snapshotTicker `json:"ticker"`
}

// snapshotTicker is the wire format for a single ticker snapshot.
type snapshotTicker struct {
	Ticker  string       `json:"ticker"`
	Day     snapshotOHLC `json:"day"`
	PrevDay snapshotOHLC `json:"prevDay"`
	Min     snapshotOHLC `json:"min"`

	TodaysChange        float64 `json:"todaysChange"`
	TodaysChangePercent float64 `json:"todaysChangePerc"`
	Updated             int64   `json:"updated"`
}

// snapshotOHLC is the wire format for OHLCV data in snapshots.
type snapshotOHLC struct {
	O  float64 `json:"o"`
	H  float64 `json:"h"`
	L  float64 `json:"l"`
	C  float64 `json:"c"`
	V  int64   `json:"v"`
	VW float64 `json:"vw"`
}

// barsResponse wraps the /v2/aggs response.
type barsResponse struct {
	Status       string    `json:"status"`
	ResultsCount int       `json:"resultsCount"`
	Results      []barWire `json:"results"`
}

// barWire is the wire format for a single bar.
type barWire struct {
	O  float64 `json:"o"`
	H  float64 `json:"h"`
	L  float64 `json:"l"`
	C  float64 `json:"c"`
	V  int64   `json:"v"`
	VW float64 `json:"vw"`
	T  int64   `json:"t"`
	N  int64   `json:"n"`
}

// indicatorResponse wraps the /v1/indicators response.
type indicatorResponse struct {
	Results indicatorResults `json:"results"`
}

// indicatorResults holds the values array from the indicator response.
type indicatorResults struct {
	Values []indicatorValue `json:"values"`
}

// indicatorValue is a single indicator data point.
type indicatorValue struct {
	Value     float64 `json:"value"`
	Timestamp int64   `json:"timestamp"`
}
