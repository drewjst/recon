'use client';

import { SectionCard } from './section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StockDetailResponse } from '@recon/shared';

interface ValuationSectionProps {
  data: StockDetailResponse;
}

export function ValuationSection({ data }: ValuationSectionProps) {
  const { valuation } = data;

  const rows = [
    { metric: 'P/E Ratio', current: valuation.pe.value, sector: valuation.pe.sectorMedian },
    { metric: 'PEG Ratio', current: valuation.peg.value, sector: valuation.peg.sectorMedian },
    { metric: 'EV/EBITDA', current: valuation.evToEbitda.value, sector: valuation.evToEbitda.sectorMedian },
    { metric: 'Price/FCF', current: valuation.priceToFcf.value, sector: valuation.priceToFcf.sectorMedian },
    { metric: 'Price/Book', current: valuation.priceToBook.value, sector: valuation.priceToBook.sectorMedian },
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
                  <TableCell className="font-medium">{row.metric}</TableCell>
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
