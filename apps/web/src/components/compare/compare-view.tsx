'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useStocks } from '@/hooks/use-stocks';
import { CompareHeader } from './compare-header';
import { MetricTable } from './metric-table';
import { ScoreComparison } from './score-comparison';
import { RankingSummary } from './ranking-summary';
import { TwoStockCompare } from './two-stock-compare';
import { calculateRankings, COMPARE_METRICS } from '@/lib/compare-utils';
import type { StockDetailResponse } from '@recon/shared';

interface CompareViewProps {
  tickers: string[];
}

export function CompareView({ tickers }: CompareViewProps) {
  const { data, isLoading, isError, errors } = useStocks(tickers);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading comparison data...</p>
      </div>
    );
  }

  // Handle case where all fetches failed
  if (isError && data.every((d) => d === undefined)) {
    const failedTickers = errors
      .map((err, i) => (err ? tickers[i] : null))
      .filter(Boolean);
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Failed to load data</h2>
        <p className="mt-2 text-muted-foreground text-center max-w-md">
          Could not fetch stock data. Please try again.
          {failedTickers.length > 0 && (
            <>
              <br />
              <span className="text-sm">Failed: {failedTickers.join(', ')}</span>
            </>
          )}
        </p>
      </div>
    );
  }

  // Filter to valid stocks only (exclude ETFs and failed fetches)
  const validStocks = data.filter(
    (d): d is StockDetailResponse => d !== undefined && d.assetType === 'stock'
  );
  const failedTickers = tickers.filter(
    (ticker, i) => !data[i] || data[i]?.assetType === 'etf'
  );

  if (validStocks.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Unable to compare</h2>
        <p className="mt-2 text-muted-foreground text-center max-w-md">
          Need at least 2 valid stocks to compare.
          {failedTickers.length > 0 && (
            <>
              <br />
              <span className="text-sm">
                Could not load: {failedTickers.join(', ')}
              </span>
            </>
          )}
        </p>
      </div>
    );
  }

  const rankings = calculateRankings(validStocks);

  // Use special 2-stock layout for exactly 2 stocks
  if (validStocks.length === 2) {
    return (
      <div className="space-y-6">
        {/* Warning for failed/ETF tickers */}
        {failedTickers.length > 0 && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Could not load: {failedTickers.join(', ')} (ETFs or invalid tickers not
            supported in compare)
          </div>
        )}

        <TwoStockCompare
          left={validStocks[0]}
          right={validStocks[1]}
          rankings={rankings}
        />
      </div>
    );
  }

  // Table layout for 3-4 stocks
  return (
    <div className="space-y-6">
      {/* Warning for failed/ETF tickers */}
      {failedTickers.length > 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Could not load: {failedTickers.join(', ')} (ETFs or invalid tickers not
          supported in compare)
        </div>
      )}

      {/* Stock Headers */}
      <CompareHeader stocks={validStocks} layout="table" />

      {/* Rankings Summary */}
      <RankingSummary rankings={rankings} />

      {/* Score Comparison */}
      <ScoreComparison stocks={validStocks} layout="table" />

      {/* Valuation Comparison */}
      <MetricTable
        title="Valuation"
        stocks={validStocks}
        metrics={COMPARE_METRICS.valuation}
        layout="table"
      />

      {/* Growth Comparison */}
      <MetricTable
        title="Growth"
        stocks={validStocks}
        metrics={COMPARE_METRICS.growth}
        layout="table"
      />

      {/* Profitability Comparison */}
      <MetricTable
        title="Margins & Returns"
        stocks={validStocks}
        metrics={COMPARE_METRICS.profitability}
        layout="table"
      />

      {/* Financial Health Comparison */}
      <MetricTable
        title="Balance Sheet"
        stocks={validStocks}
        metrics={COMPARE_METRICS.financialHealth}
        layout="table"
      />

      {/* Operating Metrics Comparison */}
      <MetricTable
        title="Operating Metrics"
        stocks={validStocks}
        metrics={COMPARE_METRICS.earningsQuality}
        layout="table"
      />

      {/* Smart Money Comparison */}
      <MetricTable
        title="Smart Money"
        stocks={validStocks}
        metrics={COMPARE_METRICS.smartMoney}
        layout="table"
      />

      {/* Analyst Estimates Comparison */}
      <MetricTable
        title="Analyst Estimates"
        stocks={validStocks}
        metrics={COMPARE_METRICS.analyst}
        layout="table"
      />

      {/* Performance Comparison */}
      <MetricTable
        title="Performance"
        stocks={validStocks}
        metrics={COMPARE_METRICS.performance}
        layout="table"
      />
    </div>
  );
}
