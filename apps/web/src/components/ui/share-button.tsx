'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** X (formerly Twitter) brand logo */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Threads brand logo */
function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.88-.73 2.082-1.146 3.478-1.208.967-.043 1.856.033 2.67.204-.02-.88-.197-1.565-.53-2.046-.387-.558-1.018-.844-1.878-.852h-.03c-.682.007-1.548.197-2.28.833l-1.327-1.572c1.087-.917 2.398-1.392 3.607-1.38 1.476.017 2.678.532 3.552 1.523.795.902 1.236 2.139 1.313 3.68.548.165 1.055.378 1.518.645 1.16.666 2.03 1.59 2.503 2.676.797 1.826.756 4.574-1.506 6.79-1.873 1.833-4.208 2.63-7.346 2.653zm-.499-7.702c-.91.04-1.6.282-2.028.653-.39.336-.474.742-.454 1.106.035.636.615 1.314 1.764 1.315.01 0 .022 0 .033-.001 1.078-.059 1.855-.434 2.377-1.147.376-.513.614-1.192.715-2.065-.653-.13-1.438-.19-2.407-.161z" />
    </svg>
  );
}

const DEFAULT_HASHTAGS = ['stocks', 'investing', 'cruxit'];
const BASE_URL = 'https://cruxit.finance';

interface ShareButtonProps extends Omit<ButtonProps, 'onClick'> {
  ticker: string;
  text?: string;
  hashtags?: string[];
  /** Custom URL to share. Defaults to stock page URL */
  url?: string;
}

function buildXShareUrl(shareUrl: string, text: string, hashtags: string[]): string {
  const params = new URLSearchParams({
    text,
    url: shareUrl,
    hashtags: hashtags.join(','),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function buildThreadsShareUrl(shareUrl: string, text: string): string {
  // Threads uses a simple text parameter with URL included in the text
  const fullText = `${text}\n\n${shareUrl}`;
  const params = new URLSearchParams({ text: fullText });
  return `https://www.threads.net/intent/post?${params.toString()}`;
}

function openShareWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=550,height=520');
}

export function ShareButton({
  ticker,
  text,
  hashtags = DEFAULT_HASHTAGS,
  url,
  variant = 'ghost',
  size = 'icon',
  className,
  ...props
}: ShareButtonProps) {
  const shareText = text ?? `Check out $${ticker} analysis on Crux`;
  const sharePageUrl = url ?? `${BASE_URL}/?ticker=${ticker}`;

  const handleShareX = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const intentUrl = buildXShareUrl(sharePageUrl, shareText, hashtags);
    openShareWindow(intentUrl);
  };

  const handleShareThreads = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const intentUrl = buildThreadsShareUrl(sharePageUrl, shareText);
    openShareWindow(intentUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          aria-label={`Share ${ticker}`}
          {...props}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={handleShareX} className="cursor-pointer">
          <XIcon className="h-4 w-4 mr-2" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareThreads} className="cursor-pointer">
          <ThreadsIcon className="h-4 w-4 mr-2" />
          Share on Threads
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Utility functions for building rich share text
 */
export function formatShareText(parts: {
  ticker: string;
  title: string;
  metrics: Array<{ label: string; value: string }>;
  verdict?: string;
}): string {
  const { ticker, title, metrics, verdict } = parts;

  // Build formatted text
  let text = `$${ticker} ${title}\n\n`;

  // Add metrics
  metrics.forEach(({ label, value }) => {
    text += `${label}: ${value}\n`;
  });

  // Add verdict if provided
  if (verdict) {
    text += `\n${verdict}`;
  }

  return text.trim();
}
