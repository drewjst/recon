import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://crux.finance';

export const metadata: Metadata = {
  title: {
    default: 'Crux - Stock Research Dashboard',
    template: '%s | Crux',
  },
  description:
    'Distill stock fundamentals into actionable signals. Research institutional ownership, insider trading, valuations, and AI-powered insights.',
  keywords: [
    'stock research',
    'fundamental analysis',
    'institutional ownership',
    'insider trading',
    'stock valuation',
    'investment research',
  ],
  authors: [{ name: 'Crux' }],
  creator: 'Crux',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Crux',
    title: 'Crux - Stock Research Dashboard',
    description:
      'Distill stock fundamentals into actionable signals. Research institutional ownership, insider trading, and valuations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crux - Stock Research Dashboard',
    description:
      'Distill stock fundamentals into actionable signals. Research institutional ownership, insider trading, and valuations.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-background`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:left-0 focus:top-0 focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to content
        </a>
        <Providers>
          <TooltipProvider>
            {/* Header spans full width */}
            <Header />
            {/* Content container with max-width and borders */}
            <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col bg-card md:border-x border-border/60 md:shadow-2xl">
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
