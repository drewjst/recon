'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import type { SectorStock } from '@/lib/api';
import type { ColumnKey } from './use-column-visibility';
import { formatCurrency } from '@/lib/format';
import { HeatmapCell } from './heatmap-cell';
import { SparklineSvg } from './sparkline-svg';
import { SmaIndicator } from './sma-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  hiddenOnMobile?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Company' },
  { key: 'price', label: 'Price' },
  { key: 'marketCap', label: 'Mkt Cap' },
  { key: 'ps', label: 'P/S' },
  { key: 'pe', label: 'P/E' },
  { key: 'roic', label: 'ROIC' },
  { key: 'ytd', label: '% YTD' },
  { key: '1m', label: '% 1M' },
  { key: '1y', label: '% 1Y' },
  { key: 'from52wHigh', label: '% 52W Hi' },
  { key: 'chart1Y', label: 'Chart 1Y', hiddenOnMobile: true },
  { key: 'rsRank', label: 'RS', hiddenOnMobile: true },
  { key: 'sma', label: 'SMA', hiddenOnMobile: true },
];

interface HeatmapTableProps {
  stocks: SectorStock[];
  visibleColumns: Set<ColumnKey>;
}

interface HeatmapRowProps {
  stock: SectorStock;
  activeCols: ColumnDef[];
  onRowClick: (ticker: string) => void;
}

const HeatmapRow = memo(function HeatmapRow({
  stock,
  activeCols,
  onRowClick,
}: HeatmapRowProps) {
  return (
    <tr
      className="border-b border-border/40 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onRowClick(stock.ticker)}
    >
      {/* Sticky ticker column */}
      <td className="sticky left-0 z-10 bg-card py-2 px-3 font-mono text-sm font-semibold whitespace-nowrap">
        {stock.ticker}
      </td>

      {activeCols.map((col) => {
        switch (col.key) {
          case 'name':
            return (
              <td
                key={col.key}
                className={`py-2 px-2 text-sm text-muted-foreground truncate max-w-[180px] ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
              >
                {stock.name}
              </td>
            );
          case 'price':
            return (
              <td key={col.key} className="py-2 px-2 text-right tabular-nums text-sm">
                ${stock.price.toFixed(2)}
              </td>
            );
          case 'marketCap':
            return (
              <td key={col.key} className="py-2 px-2 text-right tabular-nums text-sm text-muted-foreground">
                {formatCurrency(stock.marketCap)}
              </td>
            );
          case 'ps':
            return (
              <td key={col.key} className="py-2 px-2 text-right tabular-nums text-sm">
                {stock.ps != null ? stock.ps.toFixed(1) + 'x' : '--'}
              </td>
            );
          case 'pe':
            return (
              <td key={col.key} className="py-2 px-2 text-right tabular-nums text-sm">
                {stock.pe != null ? stock.pe.toFixed(1) + 'x' : '--'}
              </td>
            );
          case 'roic':
            return (
              <td key={col.key} className="py-2 px-2 text-right tabular-nums text-sm">
                {stock.roic != null ? stock.roic.toFixed(1) + '%' : '--'}
              </td>
            );
          case 'ytd':
            return (
              <HeatmapCell
                key={col.key}
                value={stock.ytdChange}
                scale="performance"
                className="text-sm"
                compact
              />
            );
          case '1m':
            return (
              <HeatmapCell
                key={col.key}
                value={stock.oneMonthChange}
                scale="performance"
                className="text-sm"
                compact
              />
            );
          case '1y':
            return (
              <HeatmapCell
                key={col.key}
                value={stock.oneYearChange}
                scale="performance"
                className="text-sm"
                compact
              />
            );
          case 'from52wHigh':
            return (
              <HeatmapCell
                key={col.key}
                value={stock.from52wHigh}
                scale="from52w"
                className="text-sm"
                compact
              />
            );
          case 'chart1Y':
            return (
              <td
                key={col.key}
                className={`py-2 px-2 ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
              >
                <SparklineSvg
                  data={stock.chartData1Y}
                  oneYearChange={stock.oneYearChange}
                />
              </td>
            );
          case 'rsRank':
            return (
              <HeatmapCell
                key={col.key}
                value={stock.rsRank}
                scale="rank"
                className={`text-sm ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
              />
            );
          case 'sma':
            return (
              <td
                key={col.key}
                className={`py-2 px-2 ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
              >
                <SmaIndicator
                  sma20={stock.sma20}
                  sma50={stock.sma50}
                  sma200={stock.sma200}
                />
              </td>
            );
          default:
            return null;
        }
      })}
    </tr>
  );
});

export function HeatmapTable({ stocks, visibleColumns }: HeatmapTableProps) {
  const router = useRouter();

  const handleRowClick = useCallback(
    (ticker: string) => {
      router.push(`/?ticker=${ticker}`);
    },
    [router]
  );

  const activeCols = COLUMNS.filter((col) => visibleColumns.has(col.key));

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ticker
            </th>
            {activeCols.map((col) => (
              <th
                key={col.key}
                className={`py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                  col.key === 'name' ? 'text-left px-2' : 'text-right'
                } ${col.key === 'ytd' || col.key === '1y' || col.key === '1m' ? 'px-1' : 'px-2'} ${col.hiddenOnMobile ? 'hidden md:table-cell' : ''}`}
              >
                {col.key === 'rsRank' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 cursor-help">
                        {col.label}
                        <Info className="h-3 w-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="text-xs">Relative Strength rank (1-99). Measures 1Y price performance vs. all stocks in this sector.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : col.key === 'sma' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 cursor-help">
                        {col.label}
                        <Info className="h-3 w-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-xs">Simple Moving Averages (20, 50, 200 day). Green = price above SMA, Red = price below.</p>
                    </TooltipContent>
                  </Tooltip>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <HeatmapRow
              key={stock.ticker}
              stock={stock}
              activeCols={activeCols}
              onRowClick={handleRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HeatmapTableSkeleton() {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ticker
            </th>
            {['Company', 'Price', 'Mkt Cap', 'P/S', 'P/E', 'ROIC', '% YTD', '% 1Y', '% 52W Hi', 'Chart', 'RS', 'SMA'].map(
              (label) => (
                <th
                  key={label}
                  className="py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right"
                >
                  {label}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 15 }, (_, i) => (
            <tr key={i} className="border-b border-border/40">
              <td className="py-2 px-3">
                <Skeleton className="h-4 w-12" />
              </td>
              {Array.from({ length: 12 }, (_, j) => (
                <td key={j} className="py-2 px-2">
                  <Skeleton className="h-4 w-14 ml-auto" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
