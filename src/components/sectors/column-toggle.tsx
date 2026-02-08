'use client';

import { Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { ColumnKey } from './use-column-visibility';

const COLUMN_LABELS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Company Name' },
  { key: 'price', label: 'Price' },
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'ps', label: 'P/S' },
  { key: 'pe', label: 'P/E' },
  { key: 'roic', label: 'ROIC' },
  { key: 'ytd', label: '% YTD' },
  { key: '1m', label: '% 1M' },
  { key: '1y', label: '% 1Y' },
  { key: 'from52wHigh', label: '% From 52W High' },
  { key: 'chart1Y', label: 'Chart 1Y' },
  { key: 'rsRank', label: 'RS Rank' },
  { key: 'sma', label: 'SMA Status' },
];

interface ColumnToggleProps {
  visibleColumns: Set<ColumnKey>;
  onToggle: (column: ColumnKey) => void;
}

export function ColumnToggle({ visibleColumns, onToggle }: ColumnToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="h-4 w-4" />
          Columns
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMN_LABELS.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={visibleColumns.has(key)}
            onCheckedChange={() => onToggle(key)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
