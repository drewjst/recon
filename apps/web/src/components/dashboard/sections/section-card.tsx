'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <Card className={cn('bg-card/50 backdrop-blur-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs uppercase text-primary font-semibold tracking-widest">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardDivider() {
  return (
    <div className="relative py-4">
      <div
        className="absolute left-1/2 -translate-x-1/2 w-screen border-t border-border/30"
        style={{ maxWidth: 'calc(100vw - 2px)' }}
      />
    </div>
  );
}
