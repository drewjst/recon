import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { Holdings } from '@recon/shared';

interface HoldingsTableProps {
  holdings: Holdings;
  isLoading?: boolean;
}

export function HoldingsTable({ holdings, isLoading }: HoldingsTableProps) {
  if (isLoading) {
    return <HoldingsTableSkeleton />;
  }

  const ownershipPercent = (holdings.totalInstitutionalOwnership * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Institutional Holdings</CardTitle>
          <Badge variant="outline" className="font-normal">
            {ownershipPercent}% institutional
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {holdings.netChangeQuarters !== 0 && (
          <div className="mb-4 text-sm">
            <span className="text-muted-foreground">Net change over {Math.abs(holdings.netChangeQuarters)} quarters: </span>
            <span className={holdings.netChangeShares > 0 ? 'text-green-600' : 'text-red-600'}>
              {holdings.netChangeShares > 0 ? '+' : ''}{formatNumber(holdings.netChangeShares)} shares
            </span>
          </div>
        )}

        {holdings.topInstitutional.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.topInstitutional.slice(0, 5).map((holder, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {holder.fundName}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(holder.shares)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(holder.value, true)}
                  </TableCell>
                  <TableCell className="text-right">
                    {holder.changePercent !== undefined ? (
                      <span className={holder.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(holder.changePercent)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No institutional holdings data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HoldingsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
