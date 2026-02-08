'use client';

import { memo } from 'react';

// Social icon components (inline SVG for X and Threads)
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.88-.73 2.082-1.146 3.381-1.177l-.005-.006c.837-.065 2.467-.011 3.761.725l.024.016c.396.224.739.492 1.024.8.104-.87.118-1.785.035-2.718l-.01-.095c-.086-.727-.243-1.393-.467-1.984a7.237 7.237 0 0 0-.135-.317l-.022-.046 1.858-.962c.09.157.175.322.254.493.35.76.59 1.608.71 2.52.032.262.056.527.07.795a8.32 8.32 0 0 1-.077 1.69c.142.097.28.199.412.306l.02.016c.94.76 1.612 1.718 2.003 2.852.48 1.39.551 3.162-.307 4.963-1.065 2.238-3.131 3.726-6.158 4.432a15.08 15.08 0 0 1-3.57.423zm1.031-8.573-.025.002c-.894.048-1.615.282-2.085.678-.471.397-.666.864-.637 1.38.03.506.278.95.74 1.25.516.336 1.236.513 2.024.47 1.091-.059 1.925-.46 2.478-1.149.377-.468.64-1.085.79-1.856-.391-.204-.832-.364-1.313-.476a8.74 8.74 0 0 0-1.972-.299z" />
    </svg>
  );
}

// Update these with your actual handles
const SOCIAL_LINKS = {
  x: 'https://x.com/cruxit_finance',
  threads: 'https://threads.net/@cruxit.finance',
};

export const SocialLinks = memo(function SocialLinks() {
  return (
    <div className="mt-8 pt-4 border-t border-border/30">
      <div className="flex items-center justify-center gap-4">
        <span className="text-xs text-muted-foreground">Follow us</span>
        <div className="flex items-center gap-3">
          <a
            href={SOCIAL_LINKS.x}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Follow us on X"
          >
            <XIcon className="h-4 w-4" />
          </a>
          <a
            href={SOCIAL_LINKS.threads}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Follow us on Threads"
          >
            <ThreadsIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
});
