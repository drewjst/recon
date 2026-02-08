'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import type { StockDetailResponse } from '@recon/shared';

interface ETFRegionsSectionProps {
  data: StockDetailResponse;
}

const REGION_COLORS: Record<string, string> = {
  'North America': 'bg-emerald-600',
  'United States': 'bg-emerald-600',
  'Europe Developed': 'bg-purple-500',
  'Europe': 'bg-purple-500',
  'Japan': 'bg-red-500',
  'Asia Developed': 'bg-orange-500',
  'Asia': 'bg-orange-500',
  'Asia Emerging': 'bg-orange-400',
  'Latin America': 'bg-amber-500',
  'Africa/Middle East': 'bg-teal-500',
  'United Kingdom': 'bg-blue-500',
  'Australasia': 'bg-cyan-500',
};

function getRegionColor(region: string): string {
  return REGION_COLORS[region] || 'bg-gray-500';
}

interface RegionRowProps {
  region: string;
  value: number;
}

function RegionRow({ region, value }: RegionRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm text-muted-foreground truncate" title={region}>
        {region}
      </div>
      <div className="flex-1">
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getRegionColor(region)}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-right font-mono text-sm">
        {value.toFixed(1)}%
      </div>
    </div>
  );
}

function ETFRegionsSectionComponent({ data }: ETFRegionsSectionProps) {
  const regions = data.etfData?.regions;
  if (!regions || regions.length === 0) return null;

  // Sort by weight descending and filter out zero values
  const sortedRegions = [...regions]
    .filter(r => r.weightPercent > 0)
    .sort((a, b) => b.weightPercent - a.weightPercent);

  if (sortedRegions.length === 0) return null;

  return (
    <SectionCard title="Geographic Allocation">
      <div className="space-y-3">
        {sortedRegions.map((region) => (
          <RegionRow
            key={region.region}
            region={region.region}
            value={region.weightPercent}
          />
        ))}
      </div>
    </SectionCard>
  );
}

export const ETFRegionsSection = memo(ETFRegionsSectionComponent);
