import { COMPARE_METRICS, getNestedValue, findWinner } from './compare-utils';
import type { StockDetailResponse } from '@recon/shared';

const CATEGORY_NAMES: Record<string, string> = {
  scores: 'Scores',
  valuation: 'Valuation',
  growth: 'Growth',
  profitability: 'Margins',
  financialHealth: 'Balance Sheet',
  earningsQuality: 'Operations',
  smartMoney: 'Smart Money',
  analyst: 'Analysts',
  performance: 'Performance',
};

export function calculateCategoryWins(left: StockDetailResponse, right: StockDetailResponse) {
  const categoryWins: { left: string[]; right: string[] } = { left: [], right: [] };

  for (const [categoryKey, metrics] of Object.entries(COMPARE_METRICS)) {
    let leftWins = 0;
    let rightWins = 0;
    for (const metric of metrics) {
      const leftVal = getNestedValue(left, metric.path);
      const rightVal = getNestedValue(right, metric.path);
      const winnerIdx = findWinner([leftVal, rightVal], metric.higherIsBetter, metric.excludeNonPositive);
      if (winnerIdx === 0) leftWins++;
      else if (winnerIdx === 1) rightWins++;
    }
    if (leftWins > rightWins) {
      categoryWins.left.push(CATEGORY_NAMES[categoryKey] || categoryKey);
    } else if (rightWins > leftWins) {
      categoryWins.right.push(CATEGORY_NAMES[categoryKey] || categoryKey);
    }
  }
  return categoryWins;
}
