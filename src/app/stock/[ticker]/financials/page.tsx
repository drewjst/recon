'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, BarChart3, Wallet, PieChart } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useStock } from '@/hooks/use-stock';
import { useIncomeStatements, useBalanceSheets, useCashFlowStatements } from '@/hooks/use-financials';
import { TickerSearch } from '@/components/search/ticker-search';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  IncomeStatementTab,
  BalanceSheetTab,
  CashFlowTab,
  SegmentsTab,
  FinancialsControls,
  type ViewMode,
  type PeriodCount,
} from '@/components/financials';
import type { FinancialsPeriodType } from '@/lib/api';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

type TabValue = 'income' | 'balance' | 'cashflow' | 'segments';

export default function FinancialsPage({ params }: PageProps) {
  const { ticker } = use(params);
  const router = useRouter();
  const { data: stockData, isLoading: stockLoading, error: stockError } = useStock(ticker);

  const handleTickerSelect = useCallback((newTicker: string) => {
    router.push(`/stock/${newTicker.toUpperCase()}/financials`);
  }, [router]);

  // Controls state
  const [periodType, setPeriodType] = useState<FinancialsPeriodType>('annual');
  const [periodCount, setPeriodCount] = useState<PeriodCount>(5);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [activeTab, setActiveTab] = useState<TabValue>('income');

  // Compute limit based on period type and count
  const limit = periodType === 'quarterly'
    ? periodCount === 5 ? 4 : periodCount === 10 ? 8 : 12
    : periodCount;

  // Fetch financial data
  const {
    data: incomeData,
    isLoading: incomeLoading,
    error: incomeError,
  } = useIncomeStatements(ticker, { period: periodType, limit });

  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalanceSheets(ticker, { period: periodType, limit });

  const {
    data: cashFlowData,
    isLoading: cashFlowLoading,
    error: cashFlowError,
  } = useCashFlowStatements(ticker, { period: periodType, limit });

  // Set dynamic page title
  useEffect(() => {
    if (stockData?.company.name) {
      document.title = `${ticker.toUpperCase()} Financial Statements | Crux`;
    }
  }, [stockData, ticker]);

  // Generate CSV content based on active tab
  const generateCSV = useCallback((): { content: string; filename: string } | null => {
    const getPeriodHeader = (p: { fiscalQuarter: number | null; fiscalYear: number }) =>
      p.fiscalQuarter ? `Q${p.fiscalQuarter} ${p.fiscalYear}` : `FY ${p.fiscalYear}`;

    if (activeTab === 'income' && incomeData?.periods) {
      const periods = incomeData.periods;
      const headers = ['Metric', ...periods.map(getPeriodHeader)];
      const rows = [
        ['Revenue', ...periods.map(p => p.revenue.toString())],
        ['Cost of Revenue', ...periods.map(p => p.costOfRevenue.toString())],
        ['Gross Profit', ...periods.map(p => p.grossProfit.toString())],
        ['Operating Expenses', ...periods.map(p => p.operatingExpenses.toString())],
        ['Operating Income', ...periods.map(p => p.operatingIncome.toString())],
        ['Net Income', ...periods.map(p => p.netIncome.toString())],
        ['EBITDA', ...periods.map(p => p.ebitda.toString())],
        ['EPS (Diluted)', ...periods.map(p => p.epsDiluted.toString())],
        ['Gross Margin %', ...periods.map(p => p.grossMargin.toFixed(2))],
        ['Operating Margin %', ...periods.map(p => p.operatingMargin.toFixed(2))],
        ['Net Margin %', ...periods.map(p => p.netMargin.toFixed(2))],
        ['EBITDA Margin %', ...periods.map(p => p.ebitdaMargin.toFixed(2))],
      ];
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      return { content: csv, filename: `${ticker.toUpperCase()}_income_statement_${periodType}.csv` };
    }

    if (activeTab === 'balance' && balanceData?.periods) {
      const periods = balanceData.periods;
      const headers = ['Metric', ...periods.map(getPeriodHeader)];
      const rows = [
        ['Cash & Equivalents', ...periods.map(p => p.cashAndEquivalents.toString())],
        ['Total Current Assets', ...periods.map(p => p.totalCurrentAssets.toString())],
        ['Total Non-Current Assets', ...periods.map(p => p.totalNonCurrentAssets.toString())],
        ['Total Assets', ...periods.map(p => p.totalAssets.toString())],
        ['Total Current Liabilities', ...periods.map(p => p.totalCurrentLiabilities.toString())],
        ['Total Non-Current Liabilities', ...periods.map(p => p.totalNonCurrentLiabilities.toString())],
        ['Total Liabilities', ...periods.map(p => p.totalLiabilities.toString())],
        ['Total Debt', ...periods.map(p => p.totalDebt.toString())],
        ['Net Debt', ...periods.map(p => p.netDebt.toString())],
        ['Total Equity', ...periods.map(p => p.totalEquity.toString())],
        ['Current Ratio', ...periods.map(p => p.currentRatio.toFixed(2))],
        ['Debt to Equity', ...periods.map(p => p.debtToEquity.toFixed(2))],
        ['Debt to Assets', ...periods.map(p => p.debtToAssets.toFixed(2))],
      ];
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      return { content: csv, filename: `${ticker.toUpperCase()}_balance_sheet_${periodType}.csv` };
    }

    if (activeTab === 'cashflow' && cashFlowData?.periods) {
      const periods = cashFlowData.periods;
      const headers = ['Metric', ...periods.map(getPeriodHeader)];
      const rows = [
        ['Operating Cash Flow', ...periods.map(p => p.operatingCashFlow.toString())],
        ['Capital Expenditures', ...periods.map(p => p.capitalExpenditures.toString())],
        ['Investing Cash Flow', ...periods.map(p => p.investingCashFlow.toString())],
        ['Dividends Paid', ...periods.map(p => p.dividendsPaid.toString())],
        ['Stock Buybacks', ...periods.map(p => p.stockBuybacks.toString())],
        ['Financing Cash Flow', ...periods.map(p => p.financingCashFlow.toString())],
        ['Free Cash Flow', ...periods.map(p => p.freeCashFlow.toString())],
      ];
      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      return { content: csv, filename: `${ticker.toUpperCase()}_cash_flow_${periodType}.csv` };
    }

    return null;
  }, [activeTab, incomeData, balanceData, cashFlowData, ticker, periodType]);

  // Export to CSV handler
  const handleExport = useCallback(() => {
    const result = generateCSV();
    if (!result) return;

    const blob = new Blob([result.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateCSV]);

  // Loading state
  if (stockLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-10 bg-muted rounded w-64" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-14 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (stockError || !stockData) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive">
            Error loading financial data
          </h2>
          <p className="text-muted-foreground mt-2">
            Could not load financial data for {ticker.toUpperCase()}
          </p>
          <Link
            href={`/stock/${ticker.toUpperCase()}`}
            className="text-primary hover:underline mt-4 inline-block"
          >
            Return to stock page
          </Link>
        </div>
      </div>
    );
  }

  // Check if export is available for current tab
  const canExport =
    (activeTab === 'income' && incomeData?.periods?.length) ||
    (activeTab === 'balance' && balanceData?.periods?.length) ||
    (activeTab === 'cashflow' && cashFlowData?.periods?.length);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="py-8 space-y-6">
        {/* Search and Back Link Row */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/stock/${ticker.toUpperCase()}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to {ticker.toUpperCase()}
          </Link>
          <div className="w-64">
            <TickerSearch
              onSelect={handleTickerSelect}
              placeholder="Search ticker..."
              buttonLabel="View"
              size="default"
            />
          </div>
        </div>

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Financial Statements
            </h1>
            <p className="text-lg text-muted-foreground">{stockData.company.name}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-0.5">
            <div className="font-medium">Currency: USD</div>
            {incomeData?.periods?.[0]?.filingDate && (
              <div>Last Filed: {new Date(incomeData.periods[0].filingDate).toLocaleDateString()}</div>
            )}
          </div>
        </div>


        {/* Controls Bar */}
        <FinancialsControls
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          periodCount={periodCount}
          onPeriodCountChange={setPeriodCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={canExport ? handleExport : undefined}
        />

        {/* Tabbed Content */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="w-full"
        >
          <TabsList className="w-full h-auto p-1 bg-muted/50 border border-border/50 rounded-xl">
            <TabsTrigger
              value="income"
              className="flex-1 gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Income Statement</span>
              <span className="sm:hidden">Income</span>
            </TabsTrigger>
            <TabsTrigger
              value="balance"
              className="flex-1 gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Balance Sheet</span>
              <span className="sm:hidden">Balance</span>
            </TabsTrigger>
            <TabsTrigger
              value="cashflow"
              className="flex-1 gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Cash Flow</span>
              <span className="sm:hidden">Cash</span>
            </TabsTrigger>
            <TabsTrigger
              value="segments"
              className="flex-1 gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Segments</span>
              <span className="sm:hidden">Seg</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="mt-6">
            {incomeLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-96 bg-muted rounded" />
              </div>
            ) : incomeError ? (
              <div className="py-12 text-center text-muted-foreground">
                Error loading income statement data
              </div>
            ) : (
              <IncomeStatementTab
                periods={incomeData?.periods || []}
                viewMode={viewMode}
              />
            )}
          </TabsContent>

          <TabsContent value="balance" className="mt-6">
            {balanceLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-96 bg-muted rounded" />
              </div>
            ) : balanceError ? (
              <div className="py-12 text-center text-muted-foreground">
                Error loading balance sheet data
              </div>
            ) : (
              <BalanceSheetTab
                periods={balanceData?.periods || []}
                viewMode={viewMode}
              />
            )}
          </TabsContent>

          <TabsContent value="cashflow" className="mt-6">
            {cashFlowLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-96 bg-muted rounded" />
              </div>
            ) : cashFlowError ? (
              <div className="py-12 text-center text-muted-foreground">
                Error loading cash flow data
              </div>
            ) : (
              <CashFlowTab
                periods={cashFlowData?.periods || []}
                viewMode={viewMode}
              />
            )}
          </TabsContent>

          <TabsContent value="segments" className="mt-6">
            <SegmentsTab ticker={ticker} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
