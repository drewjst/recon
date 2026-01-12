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
    <Card className={cn('hover:shadow-md transition-shadow cursor-default', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardDivider() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex gap-1.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-2 h-px bg-border" />
        ))}
      </div>
    </div>
  );
}
