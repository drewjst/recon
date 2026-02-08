export function AboutContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p>
        <strong className="text-foreground">Crux</strong> distills stock fundamentals into actionable signals.
        Enter a ticker, get the crux in 30 seconds.
      </p>
      <p>
        Built as an independent project to make fundamental analysis accessible to retail investors.
      </p>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Data Sources</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Financial data: Financial Modeling Prep (FMP)</li>
          <li>Institutional holdings: SEC EDGAR 13F filings</li>
          <li>Charts: TradingView</li>
        </ul>
      </div>

    </div>
  );
}

export function DisclaimerContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p className="text-xs">Last updated: January 2025</p>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Not Financial Advice</h3>
        <p>
          Crux is for <strong className="text-foreground">informational and educational purposes only</strong>.
          Nothing on this platform constitutes investment advice, financial advice,
          trading advice, or any other kind of advice.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">No Recommendations</h3>
        <p>
          The scores, grades, valuations, and signals displayed on Crux are based on
          mathematical models and historical data. They are <strong className="text-foreground">not</strong> buy,
          sell, or hold recommendations.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Risk Warning</h3>
        <p>
          All investments involve risk, including loss of principal. Past performance
          does not guarantee future results. You should not make any investment decision
          based solely on information provided by Crux.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Do Your Own Research</h3>
        <p>
          Always conduct your own research and consult with a licensed financial advisor
          before making any investment decisions.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Data Accuracy</h3>
        <p>
          While we strive for accuracy, we cannot guarantee that all information is
          complete, accurate, or up-to-date. Financial data is provided by third-party
          sources and may contain errors or delays.
        </p>
      </div>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p className="text-xs">Last updated: January 2025</p>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Information We Collect</h3>
        <p className="mb-2">Crux collects minimal data:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-foreground">Search queries:</strong> Tickers you search for (not linked to identity)</li>
          <li><strong className="text-foreground">Usage analytics:</strong> Page views, feature usage (anonymized)</li>
          <li><strong className="text-foreground">Technical data:</strong> Browser type, device type for optimization</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">What We Don&apos;t Collect</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Personal financial information</li>
          <li>Brokerage account data</li>
          <li>Email addresses (unless you contact us)</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Third-Party Services</h3>
        <p className="mb-2">We use the following services that may collect data:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-foreground">Financial Modeling Prep:</strong> Stock data provider</li>
          <li><strong className="text-foreground">TradingView:</strong> Chart widgets</li>
          <li><strong className="text-foreground">Google Cloud:</strong> Hosting infrastructure</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Cookies</h3>
        <p>
          We use minimal cookies for functionality. No advertising or tracking cookies.
        </p>
      </div>

    </div>
  );
}

export function TermsContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p className="text-xs">Last updated: January 2025</p>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Acceptance of Terms</h3>
        <p>
          By using Crux, you agree to these Terms of Service. If you do not agree,
          please do not use the service.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Service Description</h3>
        <p>
          Crux provides stock research tools and information for educational purposes.
          We do not provide investment advice or recommendations.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">No Warranty</h3>
        <p>
          Crux is provided &quot;as is&quot; without warranty of any kind. We do not guarantee
          the accuracy, completeness, or reliability of any information displayed.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, Crux and its creators shall not be
          liable for any direct, indirect, incidental, consequential, or punitive damages
          arising from your use of the service, including but not limited to investment losses.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">User Responsibilities</h3>
        <p className="mb-2">You agree to:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Use Crux for lawful purposes only</li>
          <li>Not attempt to scrape, overload, or abuse the service</li>
          <li>Not redistribute data without permission</li>
          <li>Make your own investment decisions independently</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Changes to Service</h3>
        <p>
          We reserve the right to modify, suspend, or discontinue Crux at any time without notice.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">Changes to Terms</h3>
        <p>
          We may update these terms at any time. Continued use of Crux constitutes
          acceptance of updated terms.
        </p>
      </div>
    </div>
  );
}
