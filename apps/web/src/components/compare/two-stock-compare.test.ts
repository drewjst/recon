
import { describe, it, bench } from 'vitest';
import { calculateCategoryWins } from './two-stock-compare';
import type { StockDetailResponse } from '@recon/shared';

// Mock data generator
const createMockStock = (ticker: string, seed: number): StockDetailResponse => {
  return {
    assetType: 'stock',
    company: { ticker, name: ticker, exchange: 'NAS', sector: 'Tech', industry: 'Soft' },
    quote: { price: 100 + seed, change: 1, changePercent: 1, volume: 1000, marketCap: 1000000, fiftyTwoWeekHigh: 200, fiftyTwoWeekLow: 50, asOf: '2024-01-01' },
    scores: {
      piotroski: { score: (seed % 9), breakdown: {} as any },
      ruleOf40: { score: (seed % 100), passed: true, revenueGrowthPercent: 20, profitMarginPercent: 20 },
      altmanZ: { score: (seed % 5), zone: 'safe', components: {} as any },
      dcfValuation: { intrinsicValue: 100, currentPrice: 100, differencePercent: 0, assessment: 'Fairly Valued' },
    },
    valuation: {
      pe: { value: 20 + seed, sectorMedian: 15 },
      forwardPe: { value: 18 + seed, sectorMedian: 15 },
      peg: { value: 1.5, sectorMedian: 1.5 },
      ntmPs: { value: 5, sectorMedian: 5 },
      evToEbitda: { value: 12, sectorMedian: 10 },
      priceToFcf: { value: 25, sectorMedian: 20 },
      priceToBook: { value: 4, sectorMedian: 3 },
    },
    performance: {
      day1Change: 1, week1Change: 2, month1Change: 3, ytdChange: 10, year1Change: 20, percentOf52WeekHigh: 90
    },
    profitability: {
      grossMargin: { value: 50, sectorMedian: 40, sectorMin: 10, sectorMax: 80, percentile: 60 },
      operatingMargin: { value: 20, sectorMedian: 15, sectorMin: 5, sectorMax: 30, percentile: 60 },
      netMargin: { value: 15, sectorMedian: 10, sectorMin: 2, sectorMax: 20, percentile: 60 },
      roe: { value: 15, sectorMedian: 12, sectorMin: 5, sectorMax: 25, percentile: 60 },
      roic: { value: 12, sectorMedian: 10, sectorMin: 5, sectorMax: 20, percentile: 60 },
    },
    financialHealth: {
      debtToEquity: { value: 0.5, sectorMedian: 0.8, sectorMin: 0.1, sectorMax: 2, percentile: 60 },
      currentRatio: { value: 2, sectorMedian: 1.5, sectorMin: 0.5, sectorMax: 3, percentile: 60 },
      assetTurnover: { value: 0.8, sectorMedian: 0.7, sectorMin: 0.3, sectorMax: 1.5, percentile: 60 },
    },
    growth: {
      revenueGrowthYoY: { value: 10, sectorMedian: 8, sectorMin: -5, sectorMax: 20, percentile: 60 },
      epsGrowthYoY: { value: 12, sectorMedian: 8, sectorMin: -5, sectorMax: 20, percentile: 60 },
      projectedEpsGrowth: { value: 15, sectorMedian: 10, sectorMin: 0, sectorMax: 25, percentile: 60 },
      cashFlowGrowthYoY: { value: 8, sectorMedian: 5, sectorMin: -10, sectorMax: 15, percentile: 60 },
    },
    earningsQuality: {
      revenuePerEmployee: { value: 500000, sectorMedian: 400000, sectorMin: 100000, sectorMax: 1000000, percentile: 60 },
      incomePerEmployee: { value: 100000, sectorMedian: 80000, sectorMin: 20000, sectorMax: 200000, percentile: 60 },
      accrualRatio: { value: 5, sectorMedian: 6, sectorMin: 0, sectorMax: 10, percentile: 60 },
      buybackYield: { value: 2, sectorMedian: 1, sectorMin: 0, sectorMax: 5, percentile: 60 },
    },
    holdings: {
      totalInstitutionalOwnership: 60,
      netChangeQuarters: 2,
      netChangeShares: 100000,
      topInstitutional: [],
    },
    insiderActivity: {
      buyCount90d: 2,
      sellCount90d: 1,
      netValue90d: 50000,
      trades: [],
    },
    analystEstimates: {
      rating: 'Buy',
      ratingScore: 4.5,
      analystCount: 20,
      epsGrowthNextYear: 15,
      revenueGrowthNextYear: 12,
      priceTargetAverage: 150,
      priceTargetHigh: 180,
      priceTargetLow: 120,
      strongBuyCount: 10,
      buyCount: 5,
      holdCount: 5,
      sellCount: 0,
      strongSellCount: 0,
      epsEstimateCurrentYear: 5,
      epsEstimateNextYear: 6,
      revenueEstimateCurrentYear: 100,
      revenueEstimateNextYear: 112,
    },
    signals: [],
    insiderTrades: [],
    meta: {
        fundamentalsAsOf: '',
        holdingsAsOf: '',
        priceAsOf: '',
        generatedAt: ''
    }
  };
};

describe('Comparison Calculation Performance', () => {
  const left = createMockStock('LFT', 1);
  const right = createMockStock('RGT', 2);

  it('calculates wins correctly', () => {
    const result = calculateCategoryWins(left, right);
    // Basic correctness check to ensure loop runs
    if (result.left.length === 0 && result.right.length === 0) {
        throw new Error("No wins calculated, mock data might be insufficient");
    }
  });

  // Simple loop to measure time
  it('measures execution time', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      calculateCategoryWins(left, right);
    }
    const end = performance.now();
    console.log(`10,000 iterations took ${(end - start).toFixed(2)}ms`);
    console.log(`Average per iteration: ${((end - start) / 10000).toFixed(4)}ms`);
  });
});
