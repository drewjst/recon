'use client';

import { Info, ExternalLink } from 'lucide-react';
import { SectionCard } from './section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StockDetailResponse } from '@recon/shared';

interface ValuationSectionProps {
  data: StockDetailResponse;
}

export function ValuationSection({ data }: ValuationSectionProps) {
  const { valuation } = data;
  if (!valuation) return null;

  const rows = [
    {
      metric: 'P/E Ratio',
      current: valuation.pe.value,
      sector: valuation.pe.sectorMedian,
      info: 'Price-to-Earnings ratio compares a company\'s stock price to its earnings per share. Lower P/E may indicate undervaluation relative to earnings.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-earningsratio.asp',
    },
    {
      metric: 'PEG Ratio',
      current: valuation.peg.value,
      sector: valuation.peg.sectorMedian,
      info: 'Price/Earnings-to-Growth ratio factors in expected earnings growth. A PEG below 1 may suggest the stock is undervalued relative to its growth.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pegratio.asp',
    },
    {
      metric: 'EV/EBITDA',
      current: valuation.evToEbitda.value,
      sector: valuation.evToEbitda.sectorMedian,
      info: 'Enterprise Value to EBITDA measures a company\'s total value relative to its operating earnings. Useful for comparing companies regardless of capital structure.',
      learnMoreUrl: 'https://www.investopedia.com/ask/answers/072815/how-can-i-find-companys-evebitda-multiple.asp',
    },
    {
      metric: 'Price/FCF',
      current: valuation.priceToFcf.value,
      sector: valuation.priceToFcf.sectorMedian,
      info: 'Price-to-Free Cash Flow measures how the stock price compares to cash generated after capital expenditures. Lower values may indicate better value.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/pricetofreecashflow.asp',
    },
    {
      metric: 'Price/Book',
      current: valuation.priceToBook.value,
      sector: valuation.priceToBook.sectorMedian,
      info: 'Price-to-Book ratio compares market value to book value. A P/B below 1 may indicate the stock trades below the value of its net assets.',
      learnMoreUrl: 'https://www.investopedia.com/terms/p/price-to-bookratio.asp',
    },
  ];

  const validRows = rows.filter((row) => row.current !== null);

  return (
    <SectionCard title="Valuation">
      {validRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Valuation data not available.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[150px] text-muted-foreground">Metric</TableHead>
              <TableHead className="text-right text-muted-foreground">Current</TableHead>
              <TableHead className="text-right text-muted-foreground">Sector</TableHead>
              <TableHead className="text-right text-muted-foreground">vs Sector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row) => {
              const diff = row.sector ? ((row.current! - row.sector) / row.sector) * 100 : null;
              return (
                <TableRow key={row.metric} className="border-border/30 hover:bg-secondary/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {row.metric}
                      {row.info && (
                        <TooltipProvider>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{row.info}</p>
                              {row.learnMoreUrl && (
                                <a
                                  href={row.learnMoreUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1"
                                >
                                  Learn more
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.current?.toFixed(1) ?? '-'}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {row.sector?.toFixed(1) ?? '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {diff !== null ? (
                      <span
                        className={
                          diff > 10
                            ? 'text-destructive'
                            : diff < -10
                            ? 'text-success'
                            : 'text-muted-foreground'
                        }
                      >
                        {diff > 0 ? '+' : ''}
                        {diff.toFixed(0)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}
