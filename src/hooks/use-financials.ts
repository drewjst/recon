import { useQuery } from '@tanstack/react-query';
import {
  fetchIncomeStatements,
  fetchBalanceSheets,
  fetchCashFlowStatements,
  type FinancialsPeriodType,
  type IncomeStatementResponse,
  type BalanceSheetResponse,
  type CashFlowResponse,
} from '@/lib/api';

const FINANCIALS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

interface UseFinancialsOptions {
  period?: FinancialsPeriodType;
  limit?: number;
  enabled?: boolean;
}

export function useIncomeStatements(
  ticker: string,
  options?: UseFinancialsOptions
) {
  return useQuery<IncomeStatementResponse>({
    queryKey: ['income-statements', ticker.toUpperCase(), options?.period, options?.limit],
    queryFn: () => fetchIncomeStatements(ticker, {
      period: options?.period,
      limit: options?.limit,
    }),
    staleTime: FINANCIALS_STALE_TIME,
    enabled: options?.enabled ?? Boolean(ticker),
  });
}

export function useBalanceSheets(
  ticker: string,
  options?: UseFinancialsOptions
) {
  return useQuery<BalanceSheetResponse>({
    queryKey: ['balance-sheets', ticker.toUpperCase(), options?.period, options?.limit],
    queryFn: () => fetchBalanceSheets(ticker, {
      period: options?.period,
      limit: options?.limit,
    }),
    staleTime: FINANCIALS_STALE_TIME,
    enabled: options?.enabled ?? Boolean(ticker),
  });
}

export function useCashFlowStatements(
  ticker: string,
  options?: UseFinancialsOptions
) {
  return useQuery<CashFlowResponse>({
    queryKey: ['cash-flow-statements', ticker.toUpperCase(), options?.period, options?.limit],
    queryFn: () => fetchCashFlowStatements(ticker, {
      period: options?.period,
      limit: options?.limit,
    }),
    staleTime: FINANCIALS_STALE_TIME,
    enabled: options?.enabled ?? Boolean(ticker),
  });
}
