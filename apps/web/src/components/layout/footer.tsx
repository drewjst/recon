'use client';

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
        </div>
      </div>
    </footer>
  );
}
