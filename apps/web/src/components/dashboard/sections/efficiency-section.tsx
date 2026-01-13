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

interface EfficiencySectionProps {
  data: StockDetailResponse;
}

interface EfficiencyMetric {
  metric: string;
  current: number | null;
  assessment: string;
  assessmentType: 'positive' | 'neutral' | 'negative';
}

function assessROIC(roic: number): { assessment: string; type: 'positive' | 'neutral' | 'negative' } {
  const roicPercent = roic * 100;
  if (roicPercent >= 15) return { assessment: 'Excellent', type: 'positive' };
  if (roicPercent >= 10) return { assessment: 'Good', type: 'positive' };
  if (roicPercent >= 5) return { assessment: 'Average', type: 'neutral' };
  return { assessment: 'Below avg', type: 'negative' };
}

function assessFCFYield(fcfYield: number): { assessment: string; type: 'positive' | 'neutral' | 'negative' } {
  if (fcfYield >= 5) return { assessment: 'Excellent', type: 'positive' };
  if (fcfYield >= 3) return { assessment: 'Good', type: 'positive' };
  if (fcfYield >= 1) return { assessment: 'Average', type: 'neutral' };
  return { assessment: 'Low yield', type: 'negative' };
}

function assessDebtToEquity(ratio: number): { assessment: string; type: 'positive' | 'neutral' | 'negative' } {
  if (ratio < 0.3) return { assessment: 'Very low', type: 'positive' };
  if (ratio < 0.5) return { assessment: 'Low', type: 'positive' };
  if (ratio <= 1) return { assessment: 'Moderate', type: 'neutral' };
  return { assessment: 'High', type: 'negative' };
}

function assessInterestCoverage(coverage: number | null): { assessment: string; type: 'positive' | 'neutral' | 'negative' } {
  if (coverage === null) return { assessment: 'No debt', type: 'positive' };
  if (coverage >= 10) return { assessment: 'Strong', type: 'positive' };
  if (coverage >= 5) return { assessment: 'Adequate', type: 'neutral' };
  if (coverage >= 2) return { assessment: 'Weak', type: 'negative' };
  return { assessment: 'At risk', type: 'negative' };
}

export function EfficiencySection({ data }: EfficiencySectionProps) {
  const { financials, valuation } = data;

  // Calculate FCF Yield from Price/FCF (FCF Yield = 1 / P/FCF * 100)
  const fcfYield = valuation.priceToFcf.value ? (1 / valuation.priceToFcf.value) * 100 : null;

  const roicAssessment = assessROIC(financials.roic);
  const fcfYieldAssessment = fcfYield !== null ? assessFCFYield(fcfYield) : { assessment: 'N/A', type: 'neutral' as const };
  const debtEquityAssessment = assessDebtToEquity(financials.debtToEquity);
  const interestCoverageAssessment = assessInterestCoverage(financials.interestCoverage);

  const rows: EfficiencyMetric[] = [
    {
      metric: 'ROIC',
      current: financials.roic * 100,
      assessment: roicAssessment.assessment,
      assessmentType: roicAssessment.type,
    },
    {
      metric: 'FCF Yield',
      current: fcfYield,
      assessment: fcfYieldAssessment.assessment,
      assessmentType: fcfYieldAssessment.type,
    },
    {
      metric: 'Debt/Equity',
      current: financials.debtToEquity,
      assessment: debtEquityAssessment.assessment,
      assessmentType: debtEquityAssessment.type,
    },
    {
      metric: 'Interest Coverage',
      current: financials.interestCoverage,
      assessment: interestCoverageAssessment.assessment,
      assessmentType: interestCoverageAssessment.type,
    },
  ];

  const validRows = rows.filter((row) => row.current !== null);

  const assessmentColors = {
    positive: 'text-success',
    neutral: 'text-muted-foreground',
    negative: 'text-destructive',
  };

  const formatValue = (metric: string, value: number | null): string => {
    if (value === null) return '-';
    switch (metric) {
      case 'ROIC':
      case 'FCF Yield':
        return `${value.toFixed(2)}%`;
      case 'Debt/Equity':
        return value.toFixed(2);
      case 'Interest Coverage':
        return `${value.toFixed(1)}x`;
      default:
        return value.toFixed(2);
    }
  };

  return (
    <SectionCard title="Efficiency">
      {validRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Efficiency data not available.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[150px] text-muted-foreground">Metric</TableHead>
              <TableHead className="text-right text-muted-foreground">Current</TableHead>
              <TableHead className="text-right text-muted-foreground">Assessment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validRows.map((row) => (
              <TableRow key={row.metric} className="border-border/30 hover:bg-secondary/30">
                <TableCell className="font-medium">{row.metric}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatValue(row.metric, row.current)}
                </TableCell>
                <TableCell className={`text-right font-medium ${assessmentColors[row.assessmentType]}`}>
                  {row.assessment}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}
