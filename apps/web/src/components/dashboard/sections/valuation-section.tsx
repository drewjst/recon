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
            <TableRow>
              <TableHead className="w-[150px]">Metric</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Sector</TableHead>
              <TableHead className="text-right">vs Sector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row) => {
              const diff = row.sector ? ((row.current! - row.sector) / row.sector) * 100 : null;
              return (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell className="text-right">{row.current?.toFixed(1) ?? '-'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.sector?.toFixed(1) ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {diff !== null ? (
                      <span
                        className={
                          diff > 10
                            ? 'text-red-600'
                            : diff < -10
                            ? 'text-green-600'
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
