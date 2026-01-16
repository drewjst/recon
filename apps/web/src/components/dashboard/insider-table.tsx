import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils';
import type { InsiderTrade } from '@recon/shared';

const MAX_DISPLAYED_TRADES = 10;

interface InsiderTableProps {
  trades: InsiderTrade[];
  isLoading?: boolean;
}

export function InsiderTable({ trades, isLoading }: InsiderTableProps) {
  if (isLoading) {
    return <InsiderTableSkeleton />;
  }

  const buyCount = trades.filter((t) => t.tradeType === 'buy').length;
  const sellCount = trades.filter((t) => t.tradeType === 'sell').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Insider Transactions</CardTitle>
          <div className="flex gap-2">
            <Badge variant="success" className="font-normal">
              {buyCount} buys
            </Badge>
            <Badge variant="destructive" className="font-normal">
              {sellCount} sells
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Insider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.slice(0, MAX_DISPLAYED_TRADES).map((trade) => (
                <TableRow key={`${trade.tradeDate}-${trade.insiderName}-${trade.shares}`}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(trade.tradeDate)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{trade.insiderName}</div>
                    {trade.title && (
                      <div className="text-xs text-muted-foreground">{trade.title}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={trade.tradeType === 'buy' ? 'success' : 'destructive'}
                      className="capitalize"
                    >
                      {trade.tradeType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(trade.shares)}
                  </TableCell>
                  <TableCell className="text-right">
                    {trade.value ? formatCurrency(trade.value, true) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No recent insider transactions
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InsiderTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-44" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
