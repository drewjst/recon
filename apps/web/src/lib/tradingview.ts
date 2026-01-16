/**
 * TradingView symbol formatting utilities.
 * Shared between chart components to avoid duplication.
 */

/**
 * Map of exchange names to TradingView format.
 * TradingView expects specific exchange prefixes for symbols.
 */
const EXCHANGE_MAP: Record<string, string> = {
  // NASDAQ variants
  NASDAQ: 'NASDAQ',
  'NASDAQ GLOBAL SELECT MARKET': 'NASDAQ',
  'NASDAQ GLOBAL MARKET': 'NASDAQ',
  'NASDAQ CAPITAL MARKET': 'NASDAQ',
  NGS: 'NASDAQ',
  NGM: 'NASDAQ',
  NMS: 'NASDAQ',
  // NYSE variants
  NYSE: 'NYSE',
  'NEW YORK STOCK EXCHANGE': 'NYSE',
  NYQ: 'NYSE',
  // AMEX variants
  AMEX: 'AMEX',
  'NYSE ARCA': 'AMEX',
  'NYSE MKT': 'AMEX',
  'NYSE AMERICAN': 'AMEX',
  ARCA: 'AMEX',
  PCX: 'AMEX',
  // BATS
  BATS: 'BATS',
  BZX: 'BATS',
};

/**
 * Resolves an exchange name to TradingView format.
 * Falls back to partial matching and defaults to NASDAQ.
 */
function resolveTradingViewExchange(exchange?: string): string {
  const upperExchange = (exchange || '').toUpperCase();

  // Try exact match first
  const exactMatch = EXCHANGE_MAP[upperExchange];
  if (exactMatch) return exactMatch;

  // Try partial matching for common patterns
  if (upperExchange.includes('NASDAQ')) return 'NASDAQ';
  if (upperExchange.includes('NYSE') || upperExchange.includes('NEW YORK')) return 'NYSE';
  if (upperExchange.includes('AMEX') || upperExchange.includes('AMERICAN')) return 'AMEX';

  // Default to NASDAQ for unknown US exchanges
  return 'NASDAQ';
}

/**
 * Formats a ticker symbol for TradingView widget embedding.
 * Returns format like "NASDAQ:AAPL" or "NYSE:IBM".
 */
export function formatTradingViewSymbol(ticker: string, exchange?: string): string {
  const tvExchange = resolveTradingViewExchange(exchange);
  return `${tvExchange}:${ticker}`;
}

/**
 * Formats a TradingView symbols page URL.
 * Returns URL like "https://www.tradingview.com/symbols/NASDAQ-AAPL/"
 */
export function formatTradingViewSymbolsUrl(ticker: string, exchange?: string): string {
  const tvExchange = resolveTradingViewExchange(exchange);
  return `https://www.tradingview.com/symbols/${tvExchange}-${ticker}/`;
}
