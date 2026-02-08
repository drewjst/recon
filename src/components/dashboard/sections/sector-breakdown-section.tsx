'use client';

import { memo } from 'react';
import { SectionCard } from './section-card';
import type { StockDetailResponse } from '@recon/shared';

interface SectorBreakdownSectionProps {
  data: StockDetailResponse;
}

const sectorColors: Record<string, string> = {
  Technology: 'bg-blue-500',
  Healthcare: 'bg-green-500',
  'Financial Services': 'bg-yellow-500',
  'Consumer Cyclical': 'bg-orange-500',
  'Communication Services': 'bg-purple-500',
  Industrials: 'bg-gray-500',
  'Consumer Defensive': 'bg-teal-500',
  Energy: 'bg-red-500',
  'Basic Materials': 'bg-amber-500',
  Utilities: 'bg-cyan-500',
  'Real Estate': 'bg-pink-500',
};

function SectorBreakdownSectionComponent({ data }: SectorBreakdownSectionProps) {
  const { etfData } = data;
  if (!etfData || etfData.sectorWeights.length === 0) return null;

  // Sort by weight descending
  const sortedSectors = [...etfData.sectorWeights].sort(
    (a, b) => b.weightPercent - a.weightPercent
  );

  return (
    <SectionCard title="Sector Allocation">
      <div className="space-y-3">
        {sortedSectors.map((sector) => (
          <div key={sector.sector} className="flex items-center gap-3">
            <div className="w-32 text-sm text-muted-foreground truncate">
              {sector.sector}
            </div>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${sectorColors[sector.sector] || 'bg-primary'} transition-all duration-500`}
                style={{ width: `${sector.weightPercent}%` }}
              />
            </div>
            <div className="w-14 text-right font-mono text-sm">
              {sector.weightPercent.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export const SectorBreakdownSection = memo(SectorBreakdownSectionComponent);
