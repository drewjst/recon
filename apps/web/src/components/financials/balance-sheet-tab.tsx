'use client';

import { memo, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/sparkline';
import type { BalanceSheetPeriod } from '@/lib/api';

interface BalanceSheetTabProps {
  periods: BalanceSheetPeriod[];
  viewMode: 'standard' | 'common-size' | 'growth';
}

interface RowData {
  label: string;
  key: keyof BalanceSheetPeriod | string;
  isSubtotal?: boolean;
  indent?: number;
}

interface SectionConfig {
  title: string;
  rows: RowData[];
}

const assetSections: SectionConfig[] = [
  {
    title: 'Current Assets',
    rows: [
      { label: 'Cash & Equivalents', key: 'cashAndEquivalents', indent: 1 },
      { label: 'Short-Term Investments', key: 'shortTermInvestments', indent: 1 },
      { label: 'Accounts Receivable', key: 'accountsReceivable', indent: 1 },
      { label: 'Inventory', key: 'inventory', indent: 1 },
      { label: 'Other Current Assets', key: 'otherCurrentAssets', indent: 1 },
      { label: 'Total Current Assets', key: 'totalCurrentAssets', isSubtotal: true },
    ],
  },
  {
    title: 'Non-Current Assets',
    rows: [
      { label: 'Property, Plant & Equipment', key: 'propertyPlantEquipment', indent: 1 },
      { label: 'Goodwill', key: 'goodwill', indent: 1 },
      { label: 'Intangible Assets', key: 'intangibleAssets', indent: 1 },
      { label: 'Long-Term Investments', key: 'longTermInvestments', indent: 1 },
      { label: 'Other Non-Current Assets', key: 'otherNonCurrentAssets', indent: 1 },
      { label: 'Total Non-Current Assets', key: 'totalNonCurrentAssets', isSubtotal: true },
    ],
  },
  {
    title: 'Total Assets',
    rows: [
      { label: 'Total Assets', key: 'totalAssets', isSubtotal: true },
    ],
  },
];

const liabilitySections: SectionConfig[] = [
  {
    title: 'Current Liabilities',
    rows: [
      { label: 'Accounts Payable', key: 'accountsPayable', indent: 1 },
      { label: 'Short-Term Debt', key: 'shortTermDebt', indent: 1 },
      { label: 'Deferred Revenue', key: 'deferredRevenue', indent: 1 },
      { label: 'Other Current Liabilities', key: 'otherCurrentLiabilities', indent: 1 },
      { label: 'Total Current Liabilities', key: 'totalCurrentLiabilities', isSubtotal: true },
    ],
  },
  {
    title: 'Non-Current Liabilities',
    rows: [
      { label: 'Long-Term Debt', key: 'longTermDebt', indent: 1 },
      { label: 'Deferred Tax Liabilities', key: 'deferredTaxLiabilities', indent: 1 },
      { label: 'Other Non-Current Liabilities', key: 'otherNonCurrentLiabilities', indent: 1 },
      { label: 'Total Non-Current Liabilities', key: 'totalNonCurrentLiabilities', isSubtotal: true },
    ],
  },
  {
    title: 'Total Liabilities',
    rows: [
      { label: 'Total Liabilities', key: 'totalLiabilities', isSubtotal: true },
    ],
  },
];

const equitySections: SectionConfig[] = [
  {
    title: 'Shareholders\' Equity',
    rows: [
      { label: 'Common Stock', key: 'commonStock', indent: 1 },
      { label: 'Retained Earnings', key: 'retainedEarnings', indent: 1 },
      { label: 'Accumulated Other Comprehensive Income', key: 'accumulatedOtherComprehensive', indent: 1 },
      { label: 'Treasury Stock', key: 'treasuryStock', indent: 1 },
      { label: 'Total Stockholders\' Equity', key: 'totalStockholdersEquity', isSubtotal: true },
      { label: 'Minority Interest', key: 'minorityInterest', indent: 1 },
      { label: 'Total Equity', key: 'totalEquity', isSubtotal: true },
    ],
  },
];

const debtSections: SectionConfig[] = [
  {
    title: 'Debt Summary',
    rows: [
      { label: 'Total Debt', key: 'totalDebt' },
      { label: 'Net Debt', key: 'netDebt' },
      { label: 'Working Capital', key: 'workingCapital' },
    ],
  },
];

const ratioRows: RowData[] = [
  { label: 'Current Ratio', key: 'currentRatio' },
  { label: 'Quick Ratio', key: 'quickRatio' },
  { label: 'Debt / Equity', key: 'debtToEquity' },
  { label: 'Debt / Assets', key: 'debtToAssets' },
];

function formatValue(value: number | undefined | null, isRatio = false): string {
  if (value === undefined || value === null) return '--';

  if (isRatio) {
    return value.toFixed(2);
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatGrowth(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getPeriodLabel(period: BalanceSheetPeriod): string {
  if (period.fiscalQuarter) {
    return `Q${period.fiscalQuarter} ${period.fiscalYear}`;
  }
  return `FY ${period.fiscalYear}`;
}

function isRatioKey(key: string): boolean {
  return ['currentRatio', 'quickRatio', 'debtToEquity', 'debtToAssets'].includes(key);
}

const CollapsibleSection = memo(function CollapsibleSection({
  title,
  rows,
  periods,
  viewMode,
  defaultOpen = true,
}: {
  title: string;
  rows: RowData[];
  periods: BalanceSheetPeriod[];
  viewMode: 'standard' | 'common-size' | 'growth';
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Pre-compute sparkline data for all rows (reversed: oldest→newest)
  const sparklineData = useMemo(() => {
    const data: Record<string, (number | null)[]> = {};
    rows.forEach((row) => {
      const values = periods
        .map((p) => p[row.key as keyof BalanceSheetPeriod] as number | undefined)
        .map((v) => (v !== undefined ? v : null))
        .reverse();
      data[row.key] = values;
    });
    return data;
  }, [rows, periods]);

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {title}
      </button>

      {isOpen && (
        <div>
          {rows.map((row) => {
            // Skip rows with zero values for optional fields
            const hasData = periods.some(p => {
              const val = p[row.key as keyof BalanceSheetPeriod] as number;
              return val !== 0 && val !== undefined && val !== null;
            });
            if (!hasData && [
              'shortTermInvestments', 'accountsReceivable', 'inventory', 'otherCurrentAssets',
              'propertyPlantEquipment', 'goodwill', 'intangibleAssets', 'longTermInvestments', 'otherNonCurrentAssets',
              'accountsPayable', 'shortTermDebt', 'deferredRevenue', 'otherCurrentLiabilities',
              'longTermDebt', 'deferredTaxLiabilities', 'otherNonCurrentLiabilities',
              'commonStock', 'retainedEarnings', 'accumulatedOtherComprehensive', 'treasuryStock', 'minorityInterest'
            ].includes(row.key)) {
              return null;
            }

            const rowSparklineData = sparklineData[row.key] || [];
            const hasSparklineData = rowSparklineData.filter((v) => v !== null && v !== 0).length >= 2;

            return (
              <div
                key={row.key}
                className={cn(
                  'flex items-center border-b border-border/20 last:border-0',
                  'hover:bg-muted/30 transition-colors',
                  row.isSubtotal && 'bg-muted/20'
                )}
              >
                <div
                  className={cn(
                    'sticky left-0 z-10 bg-background',
                    'min-w-[200px] w-[200px] py-2.5 px-4 text-sm',
                    row.isSubtotal && 'font-semibold',
                    row.indent && 'pl-8'
                  )}
                >
                  {row.label}
                </div>

                {/* Sparkline column */}
                <div className="min-w-[80px] w-[80px] py-1 px-2 flex items-center justify-center">
                  {hasSparklineData && (
                    <Sparkline data={rowSparklineData} width={70} height={24} />
                  )}
                </div>

                {periods.map((period) => {
                  const key = row.key as keyof BalanceSheetPeriod;
                  const value = period[key] as number | undefined;
                  const isRatio = isRatioKey(row.key);

                  let displayValue: string;
                  let colorClass = '';

                  if (viewMode === 'growth' && !isRatio) {
                    const growthKey = `${row.key}Growth` as keyof BalanceSheetPeriod;
                    const growth = period[growthKey] as number | undefined;
                    displayValue = formatGrowth(growth);
                    if (growth !== undefined && growth !== null) {
                      colorClass = growth > 0 ? 'text-success' : growth < 0 ? 'text-destructive' : '';
                    }
                  } else if (viewMode === 'common-size' && !isRatio && period.totalAssets > 0 && value !== undefined) {
                    const pctOfAssets = (value / period.totalAssets) * 100;
                    displayValue = `${pctOfAssets.toFixed(1)}%`;
                  } else {
                    displayValue = formatValue(value, isRatio);
                    if (value !== undefined && value < 0 && !isRatio) {
                      colorClass = 'text-destructive';
                    }
                  }

                  return (
                    <div
                      key={period.periodEnd}
                      className={cn(
                        'min-w-[120px] flex-1 py-2.5 px-3 text-sm text-right font-mono tabular-nums',
                        colorClass,
                        row.isSubtotal && 'font-semibold'
                      )}
                    >
                      {displayValue}
                    </div>
                  );
                })}

                {viewMode === 'standard' && !isRatioKey(row.key) && (
                  <div className="min-w-[100px] w-[100px] py-2.5 px-3 text-sm text-right font-mono tabular-nums">
                    {(() => {
                      const growthKey = `${row.key}Growth` as keyof BalanceSheetPeriod;
                      const growth = periods[0]?.[growthKey] as number | undefined;
                      if (growth === undefined || growth === null) return '--';
                      const colorClass = growth > 0 ? 'text-success' : growth < 0 ? 'text-destructive' : '';
                      return <span className={colorClass}>{formatGrowth(growth)}</span>;
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export const BalanceSheetTab = memo(function BalanceSheetTab({
  periods,
  viewMode,
}: BalanceSheetTabProps) {
  if (!periods || periods.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No balance sheet data available
      </div>
    );
  }

  const latestPeriod = periods[0];
  const totalLiabPlusEquity = latestPeriod.totalLiabilities + latestPeriod.totalEquity;
  const isBalanced = Math.abs(totalLiabPlusEquity - latestPeriod.totalAssets) < 1000;

  return (
    <div className="space-y-6">
      {/* Table Container */}
      <div className="bg-card/50 border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {/* Header Row */}
          <div className="flex items-center border-b border-border/60 bg-muted/40 sticky top-0 z-20">
            <div className="sticky left-0 z-30 bg-muted/40 min-w-[200px] w-[200px] py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Metric
            </div>
            <div className="min-w-[80px] w-[80px] py-3.5 px-2 text-xs font-semibold text-center text-muted-foreground">
              Trend
            </div>
            {periods.map((period) => (
              <div
                key={period.periodEnd}
                className="min-w-[120px] flex-1 py-3.5 px-3 text-xs font-semibold text-center text-muted-foreground"
              >
                {getPeriodLabel(period)}
              </div>
            ))}
            {viewMode === 'standard' && (
              <div className="min-w-[100px] w-[100px] py-3.5 px-3 text-xs font-semibold text-center text-muted-foreground">
                YoY %
              </div>
            )}
          </div>

          {/* Data Sections */}
          <div className="bg-background">
            {/* Assets */}
            {assetSections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                rows={section.rows}
                periods={periods}
                viewMode={viewMode}
              />
            ))}

            {/* Liabilities */}
            {liabilitySections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                rows={section.rows}
                periods={periods}
                viewMode={viewMode}
              />
            ))}

            {/* Equity */}
            {equitySections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                rows={section.rows}
                periods={periods}
                viewMode={viewMode}
              />
            ))}

            {/* Balance Verification Row */}
            <div className="flex items-center border-t border-border/60 bg-muted/30">
              <div className="sticky left-0 z-10 bg-muted/30 min-w-[200px] w-[200px] py-2.5 px-4 text-xs text-muted-foreground flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                )}
                L + E = Assets
              </div>
              <div className="min-w-[80px] w-[80px]" />
              {periods.map((period) => {
                const sum = period.totalLiabilities + period.totalEquity;
                const balanced = Math.abs(sum - period.totalAssets) < 1000;
                return (
                  <div
                    key={period.periodEnd}
                    className={cn(
                      'min-w-[120px] flex-1 py-2.5 px-3 text-xs text-right font-mono',
                      balanced ? 'text-success' : 'text-warning'
                    )}
                  >
                    {balanced ? '✓' : '≈'}
                  </div>
                );
              })}
              {viewMode === 'standard' && <div className="min-w-[100px] w-[100px]" />}
            </div>

            {/* Debt Summary */}
            {debtSections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                rows={section.rows}
                periods={periods}
                viewMode={viewMode}
              />
            ))}

            {/* Ratios Section */}
            <CollapsibleSection
              title="Key Ratios"
              rows={ratioRows}
              periods={periods}
              viewMode={viewMode}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-card/50 rounded-xl p-5 border border-border/50 shadow-sm">
        <h4 className="text-sm font-semibold mb-4">Key Metrics (Latest Period)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Assets</div>
            <div className="text-xl font-mono font-semibold">
              {periods[0]?.totalAssetsFormatted || '--'}
            </div>
            {periods[0]?.totalAssetsGrowth !== undefined && (
              <div className={cn(
                'text-sm font-mono mt-0.5',
                periods[0].totalAssetsGrowth > 0 ? 'text-success' : periods[0].totalAssetsGrowth < 0 ? 'text-destructive' : ''
              )}>
                {formatGrowth(periods[0].totalAssetsGrowth)} YoY
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Equity</div>
            <div className="text-xl font-mono font-semibold">
              {periods[0]?.totalEquityFormatted || '--'}
            </div>
            {periods[0]?.totalEquityGrowth !== undefined && (
              <div className={cn(
                'text-sm font-mono mt-0.5',
                periods[0].totalEquityGrowth > 0 ? 'text-success' : periods[0].totalEquityGrowth < 0 ? 'text-destructive' : ''
              )}>
                {formatGrowth(periods[0].totalEquityGrowth)} YoY
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Working Capital</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              periods[0]?.workingCapital > 0 ? 'text-success' : periods[0]?.workingCapital < 0 ? 'text-destructive' : ''
            )}>
              {formatValue(periods[0]?.workingCapital)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Ratio</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              periods[0]?.currentRatio >= 1.5 ? 'text-success' : periods[0]?.currentRatio < 1 ? 'text-destructive' : ''
            )}>
              {periods[0]?.currentRatio?.toFixed(2) || '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quick Ratio</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              periods[0]?.quickRatio >= 1 ? 'text-success' : periods[0]?.quickRatio < 0.5 ? 'text-destructive' : ''
            )}>
              {periods[0]?.quickRatio?.toFixed(2) || '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Debt / Equity</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              periods[0]?.debtToEquity <= 0.5 ? 'text-success' : periods[0]?.debtToEquity > 2 ? 'text-destructive' : ''
            )}>
              {periods[0]?.debtToEquity?.toFixed(2) || '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
