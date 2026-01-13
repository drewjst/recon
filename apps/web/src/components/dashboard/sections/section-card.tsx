'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function SectionCard({ title, children, className, defaultOpen = true }: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn('bg-card/50 backdrop-blur-sm', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between group cursor-pointer">
            <CardTitle className="text-xs uppercase text-primary font-semibold tracking-widest">
              {title}
            </CardTitle>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                'group-hover:text-foreground',
                isOpen && 'rotate-180'
              )}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
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
