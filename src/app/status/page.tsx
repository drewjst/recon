'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Clock, Server, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchHealth, type HealthResponse, type HealthCheck } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="w-5 h-5 text-positive" />;
    case 'degraded':
      return <AlertCircle className="w-5 h-5 text-warning" />;
    case 'unhealthy':
      return <XCircle className="w-5 h-5 text-negative" />;
    default:
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    healthy: 'default',
    degraded: 'secondary',
    unhealthy: 'destructive',
  };
  const colors: Record<string, string> = {
    healthy: 'bg-positive hover:bg-positive',
    degraded: 'bg-warning hover:bg-warning',
    unhealthy: 'bg-negative hover:bg-negative',
  };

  return (
    <Badge variant={variants[status] || 'outline'} className={colors[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CheckCard({ check }: { check: HealthCheck }) {
  const icons: Record<string, React.ElementType> = {
    database: Database,
  };
  const Icon = icons[check.name] || Server;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium capitalize">{check.name}</div>
          {check.message && (
            <div className="text-sm text-muted-foreground">{check.message}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {check.latency && (
          <span className="text-sm text-muted-foreground">{check.latency}</span>
        )}
        <StatusIcon status={check.status} />
      </div>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function StatusContent({ data, refetch, isRefetching }: { data: HealthResponse; refetch: () => void; isRefetching: boolean }) {
  return (
    <div className="space-y-8">
      {/* Header with overall status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            data.status === 'healthy' ? 'bg-positive/10' :
            data.status === 'degraded' ? 'bg-warning/10' : 'bg-negative/10'
          }`}>
            <StatusIcon status={data.status} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">API Status</h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-muted-foreground">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.uptime}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{data.version}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="w-4 h-4" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.checks.filter(c => c.status === 'healthy').length}/{data.checks.length}
            </div>
            <div className="text-sm text-muted-foreground">healthy</div>
          </CardContent>
        </Card>
      </div>

      {/* Health checks */}
      {data.checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.checks.map((check) => (
              <CheckCard key={check.name} check={check} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StatusPage() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchHealth(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>

        {isLoading ? (
          <StatusSkeleton />
        ) : error ? (
          <Card className="border-negative/50">
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center">
                <XCircle className="w-12 h-12 text-negative mb-4" />
                <h2 className="text-xl font-semibold mb-2">Unable to reach API</h2>
                <p className="text-muted-foreground mb-4">
                  The API server may be down or experiencing issues.
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : data ? (
          <StatusContent data={data} refetch={refetch} isRefetching={isRefetching} />
        ) : null}
      </div>
    </div>
  );
}
