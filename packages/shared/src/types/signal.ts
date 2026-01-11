/**
 * Signal types indicating market sentiment.
 */
export type SignalType = 'bullish' | 'bearish' | 'neutral';

/**
 * Individual trading signal.
 */
export interface Signal {
  /** Signal identifier/name */
  name: string;
  /** Overall sentiment */
  type: SignalType;
  /** Numeric score (typically 0-1 or 0-100) */
  score: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Piotroski F-Score breakdown.
 * Each component is 0 or 1, total score 0-9.
 */
export interface PiotroskiScore {
  /** Total score (0-9) */
  total: number;
  /** Profitability signals (0-4) */
  profitability: {
    positiveROA: boolean;
    positiveOperatingCashFlow: boolean;
    roaImprovement: boolean;
    cashFlowGreaterThanNetIncome: boolean;
  };
  /** Leverage/liquidity signals (0-3) */
  leverage: {
    decreasedLeverage: boolean;
    increasedCurrentRatio: boolean;
    noNewShares: boolean;
  };
  /** Operating efficiency signals (0-2) */
  efficiency: {
    improvedGrossMargin: boolean;
    improvedAssetTurnover: boolean;
  };
}

/**
 * Complete signal analysis result.
 */
export interface SignalResult {
  ticker: string;
  signals: Signal[];
  piotroskiScore: PiotroskiScore;
  overallSentiment: SignalType;
  computedAt: string;
}
