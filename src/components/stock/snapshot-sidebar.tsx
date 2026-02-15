'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StockDetailResponse } from '@recon/shared';
import { formatPercent, formatRatio, formatCompact, formatCurrency, formatDecimal } from '@/lib/formatters';

interface SnapshotSidebarProps {
  data: StockDetailResponse;
}

// Section with title and rows
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/30 last:border-b-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// Individual data row
function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

// Action link row
function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
    >
      <span>{label}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

// Color helper for percentage values
function getPercentColor(value: number | null | undefined, threshold = 0): string {
  if (value === null || value === undefined) return 'text-muted-foreground';
  return value >= threshold ? 'text-success' : 'text-destructive';
}

// Color helper for short interest (warning at 10%, danger at 20%)
function getShortInterestColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-muted-foreground';
  if (value >= 20) return 'text-destructive';
  if (value >= 10) return 'text-warning';
  return 'text-foreground';
}

export function SnapshotSidebar({ data }: SnapshotSidebarProps) {
  const { company, quote, valuation, profitability, growth, analystEstimates, holdings, shortInterest } = data;

  // Calculate upside from price target
  const priceTargetUpside = analystEstimates && quote.price > 0
    ? ((analystEstimates.priceTargetAverage - quote.price) / quote.price) * 100
    : null;

  // Institutional ownership percentage
  const institutionalPercent = holdings?.sentiment?.ownershipPercent ?? holdings?.totalInstitutionalOwnership;

  return (
    <aside className="hidden lg:block w-[260px] flex-shrink-0">
      <div className="sticky top-8 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 p-4">
        {/* Market Info */}
        <Section title="Market Info">
          <DataRow label="Exchange" value={company.exchange || '--'} />
          <DataRow label="Market Cap" value={formatCurrency(quote.marketCap)} />
          <DataRow label="Avg Volume" value={formatCompact(quote.volume)} />
        </Section>

        {/* Ownership */}
        <Section title="Ownership">
          <DataRow
            label="Institutional"
            value={institutionalPercent != null ? `${institutionalPercent.toFixed(1)}%` : '--'}
          />
          {shortInterest && (
            <>
              <DataRow
                label="Short % Float"
                value={formatPercent(shortInterest.shortPercentFloat, { decimals: 1 })}
                color={getShortInterestColor(shortInterest.shortPercentFloat)}
              />
              <DataRow
                label="Days to Cover"
                value={formatDecimal(shortInterest.daysToCover)}
              />
            </>
          )}
        </Section>

        {/* Valuation */}
        <Section title="Valuation">
          <DataRow label="P/E" value={formatRatio(valuation?.pe.value)} />
          <DataRow label="Fwd P/E" value={formatRatio(valuation?.forwardPe.value)} />
          <DataRow label="PEG" value={formatRatio(valuation?.peg.value)} />
          <DataRow label="P/FCF" value={formatRatio(valuation?.priceToFcf.value)} />
          <DataRow label="EV/EBITDA" value={formatRatio(valuation?.evToEbitda.value)} />
          <DataRow label="P/Book" value={formatRatio(valuation?.priceToBook.value)} />
        </Section>

        {/* Returns */}
        <Section title="Returns">
          <DataRow
            label="ROE"
            value={formatPercent(profitability?.roe.value, { decimals: 1 })}
            color={getPercentColor(profitability?.roe.value, 10)}
          />
          <DataRow
            label="ROIC"
            value={formatPercent(profitability?.roic.value, { decimals: 1 })}
            color={getPercentColor(profitability?.roic.value, 10)}
          />
          <DataRow
            label="Gross Margin"
            value={formatPercent(profitability?.grossMargin?.value, { decimals: 1 })}
          />
          <DataRow
            label="Op Margin"
            value={formatPercent(profitability?.operatingMargin.value, { decimals: 1 })}
          />
          <DataRow
            label="Net Margin"
            value={formatPercent(profitability?.netMargin?.value, { decimals: 1 })}
          />
        </Section>

        {/* Growth */}
        <Section title="Growth">
          <DataRow
            label="Rev YoY"
            value={formatPercent(growth?.revenueGrowthYoY.value, { showSign: true, decimals: 1 })}
            color={getPercentColor(growth?.revenueGrowthYoY.value)}
          />
          <DataRow
            label="EPS YoY"
            value={formatPercent(growth?.epsGrowthYoY.value, { showSign: true, decimals: 1 })}
            color={getPercentColor(growth?.epsGrowthYoY.value)}
          />
          {growth?.freeCashFlowTTM && (
            <DataRow
              label="FCF TTM"
              value={formatCurrency(growth.freeCashFlowTTM.value * 1_000_000)}
            />
          )}
        </Section>

        {/* Analyst */}
        {analystEstimates && (
          <Section title="Analyst">
            <DataRow
              label="Consensus"
              value={analystEstimates.rating}
              color={
                analystEstimates.ratingScore >= 4 ? 'text-success' :
                analystEstimates.ratingScore <= 2 ? 'text-destructive' :
                'text-foreground'
              }
            />
            <DataRow
              label="Target"
              value={`$${analystEstimates.priceTargetAverage.toFixed(0)}`}
            />
            {priceTargetUpside !== null && (
              <DataRow
                label="Upside"
                value={formatPercent(priceTargetUpside, { showSign: true, decimals: 0 })}
                color={getPercentColor(priceTargetUpside)}
              />
            )}
            <DataRow
              label="Analysts"
              value={`${analystEstimates.analystCount}`}
            />
          </Section>
        )}

        {/* Actions */}
        <Section title="Actions">
          <ActionLink href={`/stock/${company.ticker}/valuation`} label="Valuation Deep Dive" />
          <ActionLink href={`/stock/${company.ticker}/smart-money`} label="Institutional Deep Dive" />
        </Section>
      </div>
    </aside>
  );
}
