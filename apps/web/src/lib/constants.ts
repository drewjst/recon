export const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/** Thresholds for compact currency/number formatting */
export const FORMAT_THRESHOLDS = {
  TRILLION: 1e12,
  BILLION: 1e9,
  MILLION: 1e6,
  THOUSAND: 1e3,
} as const;

/** Percentile thresholds for color coding */
export const PERCENTILE_THRESHOLDS = {
  /** Above this is excellent (green) */
  EXCELLENT: 70,
  /** Above this is acceptable (neutral), below is poor (red) */
  ACCEPTABLE: 40,
} as const;

/** Score bar max values for visual display */
export const SCORE_MAX_VALUES = {
  PIOTROSKI: 9,
  RULE_OF_40: 100,
  ALTMAN_Z: 15,
} as const;

/** Default number of metrics to show in collapsed sections */
export const DEFAULT_METRICS_SHOWN = 5;

/** Default hashtags for social sharing */
export const SHARE_HASHTAGS = ['stocks', 'investing', 'cruxit'] as const;

/** Base URL for sharing links */
export const SHARE_BASE_URL = 'https://cruxit.finance';

export const EXAMPLE_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
];

export const SCORE_THRESHOLDS = {
  piotroski: {
    strong: 7,
    moderate: 4,
  },
  altmanZ: {
    safe: 2.99,
    gray: 1.81,
  },
  ruleOf40: {
    passing: 40,
  },
};

export const SIGNAL_COLORS = {
  bullish: 'text-green-600 bg-green-50 border-green-200',
  bearish: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  neutral: 'text-gray-600 bg-gray-50 border-gray-200',
} as const;

export const COMPARE_LIMITS = {
  MIN_TICKERS: 2,
  MAX_TICKERS: 4,
} as const;
