# Recon API Specification

Base URL: `http://localhost:8080` (development)

## Authentication

Currently, the API is unauthenticated. Future versions will support API keys for rate limit increases.

## Common Response Formats

### Success Response

```json
{
  "data": { ... }
}
```

### Error Response

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": { ... }
}
```

### Paginated Response

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 100,
    "totalPages": 5
  }
}
```

---

## Endpoints

### Health Check

Check API health status.

```
GET /health
```

**Response**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Get Stock

Retrieve stock information with fundamentals and computed ratios.

```
GET /api/v1/stocks/:ticker
```

**Parameters**

| Name | Type | In | Description |
|------|------|-----|-------------|
| ticker | string | path | Stock ticker symbol (e.g., AAPL) |

**Response**

```json
{
  "stock": {
    "id": 1,
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "fundamentals": {
      "stockId": 1,
      "fiscalYear": 2023,
      "revenue": 383285000000,
      "netIncome": 96995000000,
      "totalAssets": 352583000000,
      "totalLiabilities": 290437000000,
      "operatingCash": 110543000000,
      "sharesOutstanding": 15550000000,
      "updatedAt": "2024-01-10T00:00:00Z"
    },
    "ratios": {
      "roa": 0.275,
      "roe": 1.56,
      "currentRatio": 0.99,
      "debtToEquity": 4.67,
      "grossMargin": 0.441,
      "operatingMargin": 0.297,
      "netMargin": 0.253
    }
  }
}
```

**Errors**

| Code | Status | Description |
|------|--------|-------------|
| TICKER_NOT_FOUND | 404 | Stock not found |
| INVALID_TICKER | 400 | Invalid ticker format |

---

### Get Signals

Retrieve computed trading signals for a stock.

```
GET /api/v1/stocks/:ticker/signals
```

**Parameters**

| Name | Type | In | Description |
|------|------|-----|-------------|
| ticker | string | path | Stock ticker symbol |

**Response**

```json
{
  "result": {
    "ticker": "AAPL",
    "signals": [
      {
        "name": "Profitability",
        "type": "bullish",
        "score": 0.85,
        "description": "Strong return on assets and positive cash flow"
      },
      {
        "name": "Leverage",
        "type": "neutral",
        "score": 0.5,
        "description": "Moderate debt levels, stable liquidity"
      },
      {
        "name": "Efficiency",
        "type": "bullish",
        "score": 0.75,
        "description": "Improved asset turnover year-over-year"
      }
    ],
    "piotroskiScore": {
      "total": 7,
      "profitability": {
        "positiveROA": true,
        "positiveOperatingCashFlow": true,
        "roaImprovement": true,
        "cashFlowGreaterThanNetIncome": true
      },
      "leverage": {
        "decreasedLeverage": false,
        "increasedCurrentRatio": true,
        "noNewShares": true
      },
      "efficiency": {
        "improvedGrossMargin": true,
        "improvedAssetTurnover": false
      }
    },
    "overallSentiment": "bullish",
    "computedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Errors**

| Code | Status | Description |
|------|--------|-------------|
| TICKER_NOT_FOUND | 404 | Stock not found |
| INSUFFICIENT_DATA | 422 | Not enough historical data to compute signals |

---

### Search Stocks

Search for stocks by ticker or name.

```
GET /api/v1/stocks/search
```

**Query Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| q | string | Yes | Search query (min 1 character) |
| limit | integer | No | Max results (default: 10, max: 50) |

**Response**

```json
{
  "stocks": [
    {
      "id": 1,
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## Rate Limiting

| Tier | Requests/minute |
|------|-----------------|
| Anonymous | 30 |
| Authenticated | 100 |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1705312200
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| TICKER_NOT_FOUND | 404 | Stock ticker does not exist |
| INVALID_TICKER | 400 | Ticker format is invalid |
| INSUFFICIENT_DATA | 422 | Cannot compute signals with available data |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Versioning

The API is versioned via URL path (`/api/v1/`). Breaking changes will result in a new version. Non-breaking additions (new fields, new endpoints) may be added to existing versions.
