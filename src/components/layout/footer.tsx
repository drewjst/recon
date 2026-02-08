'use client';

import { Github } from 'lucide-react';
import { LegalModal } from '@/components/legal-modal';
import { AboutContent, DisclaimerContent, PrivacyContent, TermsContent } from '@/components/legal-content';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          © 2025 Crux. Not financial advice.
        </p>
        <div className="flex items-center gap-6">
          <LegalModal trigger="About" title="About Crux">
            <AboutContent />
          </LegalModal>
          <LegalModal trigger="Disclaimer" title="Investment Disclaimer">
            <DisclaimerContent />
          </LegalModal>
          <LegalModal trigger="Privacy" title="Privacy Policy">
            <PrivacyContent />
          </LegalModal>
          <LegalModal trigger="Terms" title="Terms of Service">
            <TermsContent />
          </LegalModal>
          <a
            href="https://github.com/drewjst/crux"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1.5"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
