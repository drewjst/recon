'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Rocket,
  Gem,
  Landmark,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScreenerFilters } from '@/lib/api';

// =============================================================================
// Preset definitions
// =============================================================================

interface PresetScreen {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  filters: ScreenerFilters;
}

const PRESET_SCREENS: PresetScreen[] = [
  {
    id: 'quality-growth',
    name: 'Quality Growth',
    icon: TrendingUp,
    description: 'High-quality companies with consistent growth and strong margins',
    filters: {
      marketCapMin: 10_000_000_000,
      roeMin: 0.15,
      revenueGrowthMin: 0.10,
      grossMarginMin: 0.40,
      debtToEquityMax: 1,
      piotroskiScoreMin: 6,
      sort: 'revenue_growth',
      order: 'desc',
    },
  },
  {
    id: 'value-plays',
    name: 'Value Plays',
    icon: DollarSign,
    description: 'Undervalued stocks with low multiples and solid fundamentals',
    filters: {
      peMax: 15,
      pbMax: 2,
      debtToEquityMax: 1,
      currentRatioMin: 1.5,
      piotroskiScoreMin: 5,
      sort: 'pe',
      order: 'asc',
    },
  },
  {
    id: 'high-growth',
    name: 'High Growth',
    icon: Rocket,
    description: 'Fast-growing companies with strong top-line expansion',
    filters: {
      revenueGrowthMin: 0.25,
      grossMarginMin: 0.50,
      sort: 'revenue_growth',
      order: 'desc',
    },
  },
  {
    id: 'garp',
    name: 'GARP',
    icon: Gem,
    description: 'Growth at a Reasonable Price — balanced growth and valuation',
    filters: {
      pegMax: 2,
      revenueGrowthMin: 0.10,
      peMax: 30,
      roeMin: 0.12,
      sort: 'peg',
      order: 'asc',
    },
  },
  {
    id: 'dividend-income',
    name: 'Dividend Income',
    icon: Landmark,
    description: 'Reliable dividend payers with healthy yields and fundamentals',
    filters: {
      dividendYieldMin: 0.02,
      dividendYieldMax: 0.08,
      piotroskiScoreMin: 5,
      fcfMarginMin: 0.05,
      sort: 'dividend_yield',
      order: 'desc',
    },
  },
  {
    id: 'high-roic',
    name: 'High ROIC',
    icon: Zap,
    description: 'Capital-efficient compounders with durable advantages',
    filters: {
      roicMin: 0.20,
      grossMarginMin: 0.30,
      debtToEquityMax: 2,
      sort: 'roic',
      order: 'desc',
    },
  },
  {
    id: 'small-cap-quality',
    name: 'Small Cap Quality',
    icon: Search,
    description: 'Quality small caps under $10B with growth and low leverage',
    filters: {
      marketCapMax: 10_000_000_000,
      roeMin: 0.12,
      revenueGrowthMin: 0.15,
      epsGrowthMin: 0.10,
      debtToEquityMax: 0.5,
      sort: 'revenue_growth',
      order: 'desc',
    },
  },
  {
    id: 'financial-strength',
    name: 'Financial Strength',
    icon: Shield,
    description: 'Companies with the strongest balance sheets and credit quality',
    filters: {
      altmanZMin: 3,
      piotroskiScoreMin: 7,
      currentRatioMin: 2,
      debtToEquityMax: 0.5,
      sort: 'piotroski_score',
      order: 'desc',
    },
  },
];

// =============================================================================
// Matching logic
// =============================================================================

/** Keys to compare when checking if a preset is active (ignore sort/pagination). */
const FILTER_COMPARE_KEYS: (keyof ScreenerFilters)[] = [
  'sectors', 'industry',
  'marketCapMin', 'marketCapMax',
  'peMin', 'peMax', 'forwardPeMin', 'forwardPeMax',
  'psMin', 'psMax', 'pbMin', 'pbMax',
  'evEbitdaMin', 'evEbitdaMax', 'pegMin', 'pegMax',
  'dividendYieldMin', 'dividendYieldMax',
  'revenueGrowthMin', 'revenueGrowthMax',
  'epsGrowthMin', 'epsGrowthMax',
  'grossMarginMin', 'grossMarginMax',
  'operatingMarginMin', 'operatingMarginMax',
  'netMarginMin', 'netMarginMax',
  'fcfMarginMin', 'fcfMarginMax',
  'roeMin', 'roeMax', 'roicMin', 'roicMax',
  'debtToEquityMin', 'debtToEquityMax',
  'currentRatioMin', 'currentRatioMax',
  'piotroskiScoreMin', 'altmanZMin',
];

function arraysEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

/** Check if a preset's non-sort filters match the current active filters. */
function isPresetActive(preset: PresetScreen, active: ScreenerFilters): boolean {
  for (const key of FILTER_COMPARE_KEYS) {
    const pv = preset.filters[key];
    const av = active[key];

    const pvSet = pv != null && (Array.isArray(pv) ? pv.length > 0 : true);
    const avSet = av != null && (Array.isArray(av) ? av.length > 0 : true);

    if (pvSet !== avSet) return false;
    if (!pvSet) continue;

    if (Array.isArray(pv) && Array.isArray(av)) {
      if (!arraysEqual(pv, av)) return false;
    } else if (pv !== av) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Component
// =============================================================================

interface QuickScreensProps {
  onSelect: (filters: ScreenerFilters) => void;
  activeFilters: ScreenerFilters;
}

export function QuickScreens({ onSelect, activeFilters }: QuickScreensProps) {
  const activePresetId = useMemo(() => {
    const match = PRESET_SCREENS.find((preset) => isPresetActive(preset, activeFilters));
    return match?.id ?? null;
  }, [activeFilters]);

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quick Screens
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {PRESET_SCREENS.map((preset) => {
          const isActive = preset.id === activePresetId;
          const Icon = preset.icon;

          return (
            <Tooltip key={preset.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(preset.filters)}
                  className={cn(
                    'group flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground/60 group-hover:text-foreground'
                    )}
                  />
                  <span className="whitespace-nowrap">{preset.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                {preset.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
