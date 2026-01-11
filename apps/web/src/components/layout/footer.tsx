import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 py-8">
        <p className="text-sm text-muted-foreground">
          Recon distills stock fundamentals into actionable signals.
        </p>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
