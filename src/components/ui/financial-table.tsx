'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPercent,
  formatGrowth,
  formatNumber,
  getGrowthColor,
} from '@/lib/format';

export type ColumnType = 'text' | 'currency' | 'percent' | 'growth' | 'number';

export interface Column {
  key: string;
  header: string;
  align?: 'left' | 'right';
  type?: ColumnType;
  /** Width class (e.g., 'w-[200px]' or 'min-w-[120px]') */
  width?: string;
}

export interface RowData {
  [key: string]: unknown;
  /** Whether this row is a subtotal/header row */
  isSubtotal?: boolean;
  /** Indent level for child rows (0 = parent, 1+ = child) */
  indent?: number;
  /** Child rows for expandable sections */
  children?: RowData[];
}

interface FinancialTableProps {
  columns: Column[];
  data: RowData[];
  rowKey: string;
  expandable?: boolean;
  stickyFirstColumn?: boolean;
  className?: string;
}

function formatCellValue(value: unknown, type?: ColumnType): ReactNode {
  if (value == null) return '—';

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));

  switch (type) {
    case 'currency':
      return formatCurrency(numValue);
    case 'percent':
      return formatPercent(numValue);
    case 'growth':
      return (
        <span className={getGrowthColor(numValue)}>
          {formatGrowth(numValue)}
        </span>
      );
    case 'number':
      return formatNumber(numValue);
    case 'text':
    default:
      return String(value);
  }
}

interface TableRowProps {
  row: RowData;
  columns: Column[];
  rowKey: string;
  expandable: boolean;
  stickyFirstColumn: boolean;
  level?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function TableRow({
  row,
  columns,
  rowKey,
  expandable,
  stickyFirstColumn,
  level = 0,
  isExpanded,
  onToggle,
}: TableRowProps) {
  const hasChildren = expandable && row.children && row.children.length > 0;
  const isSubtotal = row.isSubtotal;
  const indent = row.indent ?? level;

  return (
    <tr
      className={cn(
        'border-b border-border/30 last:border-0',
        'hover:bg-muted/50 transition-colors',
        isSubtotal && 'font-medium bg-muted/30'
      )}
    >
      {columns.map((column, colIndex) => {
        const isFirstColumn = colIndex === 0;
        const value = row[column.key];
        const alignRight = column.align === 'right' ||
          (column.type && ['currency', 'percent', 'growth', 'number'].includes(column.type));

        return (
          <td
            key={column.key}
            className={cn(
              'py-2.5 px-3 text-sm',
              alignRight ? 'text-right' : 'text-left',
              column.type !== 'text' && 'font-mono tabular-nums',
              stickyFirstColumn && isFirstColumn && 'sticky left-0 z-10 bg-background',
              column.width
            )}
          >
            <div
              className={cn(
                'flex items-center',
                alignRight && 'justify-end',
                isFirstColumn && indent > 0 && `pl-${indent * 4}`
              )}
              style={isFirstColumn && indent > 0 ? { paddingLeft: `${indent * 1}rem` } : undefined}
            >
              {isFirstColumn && hasChildren && (
                <button
                  onClick={onToggle}
                  className="mr-1 p-0.5 hover:bg-muted rounded"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {formatCellValue(value, column.type)}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export function FinancialTable({
  columns,
  data,
  rowKey,
  expandable = false,
  stickyFirstColumn = false,
  className,
}: FinancialTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderRows = (rows: RowData[], level = 0): ReactNode[] => {
    return rows.flatMap((row) => {
      const key = String(row[rowKey]);
      const isExpanded = expandedRows.has(key);
      const hasChildren = row.children && row.children.length > 0;

      const elements: ReactNode[] = [
        <TableRow
          key={key}
          row={row}
          columns={columns}
          rowKey={rowKey}
          expandable={expandable}
          stickyFirstColumn={stickyFirstColumn}
          level={level}
          isExpanded={isExpanded}
          onToggle={() => toggleRow(key)}
        />,
      ];

      if (hasChildren && isExpanded) {
        elements.push(...renderRows(row.children!, level + 1));
      }

      return elements;
    });
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((column, colIndex) => {
              const isFirstColumn = colIndex === 0;
              const alignRight = column.align === 'right' ||
                (column.type && ['currency', 'percent', 'growth', 'number'].includes(column.type));

              return (
                <th
                  key={column.key}
                  className={cn(
                    'py-3 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground',
                    alignRight ? 'text-right' : 'text-left',
                    stickyFirstColumn && isFirstColumn && 'sticky left-0 z-10 bg-background',
                    column.width
                  )}
                >
                  {column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{renderRows(data)}</tbody>
      </table>
    </div>
  );
}
