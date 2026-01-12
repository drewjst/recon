import Link from 'next/link';
import { BarChart3 } from 'lucide-react';


export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-xl text-foreground">Recon</span>
        </Link>
      </div>
    </header>
  );
}
