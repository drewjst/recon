'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LegalModalProps {
  trigger: string;
  title: string;
  children: React.ReactNode;
}

export function LegalModal({ trigger, title, children }: LegalModalProps) {
  return (
    <Dialog>
      <DialogTrigger className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
