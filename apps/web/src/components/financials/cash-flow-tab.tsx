'use client';

import { memo, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/ui/sparkline';
import type { CashFlowPeriod } from '@/lib/api';

interface CashFlowTabProps {
  periods: CashFlowPeriod[];
  viewMode: 'standard' | 'common-size' | 'growth';
}

interface RowData {
  label: string;
  key: keyof CashFlowPeriod | string;
  isSubtotal?: boolean;
  indent?: number;
}

interface SectionConfig {
  title: string;
  rows: RowData[];
}

const sections: SectionConfig[] = [
  {
    title: 'Operating Activities',
    rows: [
      { label: 'Net Income', key: 'netIncome', indent: 1 },
      { label: 'Depreciation & Amortization', key: 'depreciationAmortization', indent: 1 },
      { label: 'Stock-Based Compensation', key: 'stockBasedCompensation', indent: 1 },
      { label: 'Change in Working Capital', key: 'changeInWorkingCapital', indent: 1 },
      { label: 'Operating Cash Flow', key: 'operatingCashFlow', isSubtotal: true },
    ],
  },
  {
    title: 'Investing Activities',
    rows: [
      { label: 'Capital Expenditures', key: 'capitalExpenditures', indent: 1 },
      { label: 'Acquisitions', key: 'acquisitions', indent: 1 },
      { label: 'Investing Cash Flow', key: 'investingCashFlow', isSubtotal: true },
    ],
  },
  {
    title: 'Financing Activities',
    rows: [
      { label: 'Debt Issuance', key: 'debtIssuance', indent: 1 },
      { label: 'Debt Repayment', key: 'debtRepayment', indent: 1 },
      { label: 'Stock Buybacks', key: 'stockBuybacks', indent: 1 },
      { label: 'Dividends Paid', key: 'dividendsPaid', indent: 1 },
      { label: 'Financing Cash Flow', key: 'financingCashFlow', isSubtotal: true },
    ],
  },
  {
    title: 'Summary',
    rows: [
      { label: 'Net Change in Cash', key: 'netChangeInCash' },
      { label: 'Free Cash Flow', key: 'freeCashFlow', isSubtotal: true },
      { label: 'FCF Conversion %', key: 'fcfConversion' },
    ],
  },
];

function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--';

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

function getPeriodLabel(period: CashFlowPeriod): string {
  if (period.fiscalQuarter) {
    return `Q${period.fiscalQuarter} ${period.fiscalYear}`;
  }
  return `FY ${period.fiscalYear}`;
}

function isPercentKey(key: string): boolean {
  return key.includes('Conversion');
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
  periods: CashFlowPeriod[];
  viewMode: 'standard' | 'common-size' | 'growth';
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Pre-compute sparkline data for all rows (reversed: oldest→newest)
  const sparklineData = useMemo(() => {
    const data: Record<string, (number | null)[]> = {};
    rows.forEach((row) => {
      const values = periods
        .map((p) => p[row.key as keyof CashFlowPeriod] as number | undefined)
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
              const val = p[row.key as keyof CashFlowPeriod] as number;
              return val !== 0 && val !== undefined && val !== null;
            });
            if (!hasData && ['depreciationAmortization', 'stockBasedCompensation', 'changeInWorkingCapital', 'acquisitions', 'debtIssuance', 'debtRepayment'].includes(row.key)) {
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
                  const key = row.key as keyof CashFlowPeriod;
                  const value = period[key] as number | undefined;
                  const isPercent = isPercentKey(row.key);

                  let displayValue: string;
                  let colorClass = '';

                  if (viewMode === 'growth' && !isPercent) {
                    const growthKey = `${row.key}Growth` as keyof CashFlowPeriod;
                    const growth = period[growthKey] as number | undefined;
                    displayValue = formatGrowth(growth);
                    if (growth !== undefined && growth !== null) {
                      colorClass = growth > 0 ? 'text-success' : growth < 0 ? 'text-destructive' : '';
                    }
                  } else if (viewMode === 'common-size' && period.operatingCashFlow !== 0 && value !== undefined && !isPercent) {
                    const pctOfCFO = (value / Math.abs(period.operatingCashFlow)) * 100;
                    displayValue = `${pctOfCFO.toFixed(1)}%`;
                  } else if (isPercent) {
                    displayValue = value !== undefined ? `${value.toFixed(1)}%` : '--';
                    if (value !== undefined) {
                      colorClass = value >= 70 ? 'text-success' : value < 50 ? 'text-destructive' : '';
                    }
                  } else {
                    displayValue = formatValue(value);
                    if (value !== undefined) {
                      if (['operatingCashFlow', 'freeCashFlow'].includes(row.key)) {
                        colorClass = value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : '';
                      } else if (value < 0) {
                        colorClass = 'text-destructive';
                      }
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

                {viewMode === 'standard' && !isPercentKey(row.key) && (
                  <div className="min-w-[100px] w-[100px] py-2.5 px-3 text-sm text-right font-mono tabular-nums">
                    {(() => {
                      const growthKey = `${row.key}Growth` as keyof CashFlowPeriod;
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

const CashFlowWaterfall = memo(function CashFlowWaterfall({
  period,
}: {
  period: CashFlowPeriod;
}) {
  const cfo = period.operatingCashFlow;
  const capex = Math.abs(period.capitalExpenditures);
  const fcf = period.freeCashFlow;
  const buybacks = Math.abs(period.stockBuybacks);
  const dividends = Math.abs(period.dividendsPaid);

  const maxValue = Math.max(Math.abs(cfo), Math.abs(fcf), capex, buybacks, dividends);
  const scale = (val: number) => (Math.abs(val) / maxValue) * 100;

  const items = [
    { label: 'CFO', value: cfo, color: 'bg-emerald-500', width: scale(cfo) },
    { label: 'CapEx', value: -capex, color: 'bg-amber-500', width: scale(capex) },
    { label: 'FCF', value: fcf, color: 'bg-primary', width: scale(fcf) },
    { label: 'Buybacks', value: -buybacks, color: 'bg-rose-500/70', width: scale(buybacks) },
    { label: 'Dividends', value: -dividends, color: 'bg-rose-500/50', width: scale(dividends) },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-4">
          <div className="w-20 text-sm text-muted-foreground text-right font-medium">{item.label}</div>
          <div className="flex-1 h-7 bg-muted/40 rounded-lg relative overflow-hidden">
            <div
              className={cn('h-full rounded-lg transition-all duration-500', item.color)}
              style={{ width: `${Math.max(item.width, 2)}%` }}
            />
          </div>
          <div className={cn(
            'w-24 text-sm font-mono text-right tabular-nums',
            item.value >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {formatValue(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
});

export const CashFlowTab = memo(function CashFlowTab({
  periods,
  viewMode,
}: CashFlowTabProps) {
  if (!periods || periods.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No cash flow data available
      </div>
    );
  }

  const latestPeriod = periods[0];

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
            {sections.map((section) => (
              <CollapsibleSection
                key={section.title}
                title={section.title}
                rows={section.rows}
                periods={periods}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Waterfall */}
      <div className="bg-card/50 rounded-xl p-5 border border-border/50 shadow-sm">
        <h4 className="text-sm font-semibold mb-4">Cash Flow Waterfall ({getPeriodLabel(latestPeriod)})</h4>
        <CashFlowWaterfall period={latestPeriod} />
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-card/50 rounded-xl p-5 border border-border/50 shadow-sm">
        <h4 className="text-sm font-semibold mb-4">Key Metrics (Latest Period)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Operating CF</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              latestPeriod.operatingCashFlow > 0 ? 'text-success' : 'text-destructive'
            )}>
              {latestPeriod.operatingCashFlowFormatted || '--'}
            </div>
            {latestPeriod.operatingCashFlowGrowth !== undefined && (
              <div className={cn(
                'text-sm font-mono mt-0.5',
                latestPeriod.operatingCashFlowGrowth > 0 ? 'text-success' : latestPeriod.operatingCashFlowGrowth < 0 ? 'text-destructive' : ''
              )}>
                {formatGrowth(latestPeriod.operatingCashFlowGrowth)} YoY
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Free Cash Flow</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              latestPeriod.freeCashFlow > 0 ? 'text-success' : 'text-destructive'
            )}>
              {latestPeriod.freeCashFlowFormatted || '--'}
            </div>
            {latestPeriod.freeCashFlowGrowth !== undefined && (
              <div className={cn(
                'text-sm font-mono mt-0.5',
                latestPeriod.freeCashFlowGrowth > 0 ? 'text-success' : latestPeriod.freeCashFlowGrowth < 0 ? 'text-destructive' : ''
              )}>
                {formatGrowth(latestPeriod.freeCashFlowGrowth)} YoY
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">FCF Conversion</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              latestPeriod.fcfConversion >= 70 ? 'text-success' : latestPeriod.fcfConversion < 50 ? 'text-destructive' : ''
            )}>
              {latestPeriod.fcfConversion?.toFixed(1) || '--'}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">FCF / CFO</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CapEx</div>
            <div className="text-xl font-mono font-semibold text-destructive">
              {formatValue(latestPeriod.capitalExpenditures)}
            </div>
            {latestPeriod.capexGrowth !== undefined && (
              <div className={cn(
                'text-sm font-mono mt-0.5',
                latestPeriod.capexGrowth > 0 ? 'text-destructive' : latestPeriod.capexGrowth < 0 ? 'text-success' : ''
              )}>
                {formatGrowth(latestPeriod.capexGrowth)} YoY
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Shareholder Returns</div>
            <div className="text-xl font-mono font-semibold">
              {formatValue(Math.abs(latestPeriod.dividendsPaid) + Math.abs(latestPeriod.stockBuybacks))}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Div + Buybacks
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Change</div>
            <div className={cn(
              'text-xl font-mono font-semibold',
              latestPeriod.netChangeInCash > 0 ? 'text-success' : latestPeriod.netChangeInCash < 0 ? 'text-destructive' : ''
            )}>
              {formatValue(latestPeriod.netChangeInCash)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              CFO+CFI+CFF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
