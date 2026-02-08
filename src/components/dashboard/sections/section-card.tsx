'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareButton } from '@/components/ui/share-button';
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
  /** Ticker for share functionality. If provided, shows share button */
  shareTicker?: string;
  /** Custom share text. Required if shareTicker is provided */
  shareText?: string;
  /** Optional content to render on the right side of the header (e.g., filters, selectors) */
  headerRight?: React.ReactNode;
}

export function SectionCard({
  title,
  children,
  className,
  defaultOpen = true,
  shareTicker,
  shareText,
  headerRight,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn('bg-card/50 backdrop-blur-sm', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex w-full items-center justify-between">
            <CollapsibleTrigger className="flex flex-1 items-center justify-between group cursor-pointer">
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
            {headerRight && (
              <div className="ml-4" onClick={(e) => e.stopPropagation()}>
                {headerRight}
              </div>
            )}
            {shareTicker && shareText && (
              <ShareButton
                ticker={shareTicker}
                text={shareText}
                size="icon"
                className="h-6 w-6 ml-2 opacity-50 hover:opacity-100"
              />
            )}
          </div>
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
    <div className="relative py-3">
      <div className="w-full border-t border-border/50" />
    </div>
  );
}
