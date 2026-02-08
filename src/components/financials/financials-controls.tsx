'use client';

import { memo } from 'react';
import { Download, Calendar, Hash, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialsPeriodType } from '@/lib/api';

export type ViewMode = 'standard' | 'common-size' | 'growth';
export type PeriodCount = 5 | 10 | 3;

interface FinancialsControlsProps {
  periodType: FinancialsPeriodType;
  onPeriodTypeChange: (type: FinancialsPeriodType) => void;
  periodCount: PeriodCount;
  onPeriodCountChange: (count: PeriodCount) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExport?: () => void;
}

interface ToggleButtonGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function ToggleButtonGroup({ options, value, onChange }: ToggleButtonGroupProps) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export const FinancialsControls = memo(function FinancialsControls({
  periodType,
  onPeriodTypeChange,
  periodCount,
  onPeriodCountChange,
  viewMode,
  onViewModeChange,
  onExport,
}: FinancialsControlsProps) {
  const periodTypeOptions = [
    { value: 'annual', label: 'Annual' },
    { value: 'quarterly', label: 'Quarterly' },
  ];

  const periodCountOptions = periodType === 'quarterly'
    ? [
        { value: '5', label: '4Q' },
        { value: '10', label: '8Q' },
        { value: '3', label: '12Q' },
      ]
    : [
        { value: '3', label: '3Y' },
        { value: '5', label: '5Y' },
        { value: '10', label: '10Y' },
      ];

  const viewModeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'common-size', label: '% Revenue' },
    { value: 'growth', label: 'Growth' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 px-5 bg-card/50 rounded-xl border border-border/50 shadow-sm">
      {/* Period Type */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Period</span>
        </div>
        <ToggleButtonGroup
          options={periodTypeOptions}
          value={periodType}
          onChange={(v) => onPeriodTypeChange(v as FinancialsPeriodType)}
        />
      </div>

      {/* Period Count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Range</span>
        </div>
        <ToggleButtonGroup
          options={periodCountOptions}
          value={periodCount.toString()}
          onChange={(v) => onPeriodCountChange(Number(v) as PeriodCount)}
        />
      </div>

      {/* View Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">View</span>
        </div>
        <ToggleButtonGroup
          options={viewModeOptions}
          value={viewMode}
          onChange={(v) => onViewModeChange(v as ViewMode)}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export Button */}
      {onExport && (
        <button
          onClick={onExport}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
            'rounded-lg border border-border/60 bg-background',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'shadow-sm transition-all duration-200 hover:shadow'
          )}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      )}
    </div>
  );
});
