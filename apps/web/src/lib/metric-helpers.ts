/**
 * Shared metric helper functions.
 * Consolidates duplicated metric conversion and formatting logic.
 */

import type { Metric } from '@/components/dashboard/sections/metric-section';
import type { ValuationMetric, SectorMetric } from '@recon/shared';

/**
 * Options for converting a metric to the standardized Metric format.
 */
export interface ToMetricOptions {
  format: Metric['format'];
  higherIsBetter: boolean;
  info?: string;
  learnMoreUrl?: string;
}

/**
 * A metric source that has value, sectorMedian, and percentile fields.
 * Works with both ValuationMetric and SectorMetric types.
 */
type MetricSource = ValuationMetric | SectorMetric | undefined;

/**
 * Convert a ValuationMetric or SectorMetric to the standardized Metric format.
 * This is a shared helper used by all metric section components.
 */
export function toMetric(
  key: string,
  label: string,
  source: MetricSource,
  options: ToMetricOptions
): Metric {
  return {
    key,
    label,
    value: source?.value ?? null,
    industryAverage: source?.sectorMedian ?? null,
    percentile: source?.percentile ?? null,
    format: options.format,
    higherIsBetter: options.higherIsBetter,
    info: options.info,
    learnMoreUrl: options.learnMoreUrl,
  };
}

/**
 * Build share text from a list of metrics.
 * Filters out null values and joins with newlines.
 */
export function buildShareText(
  ticker: string,
  title: string,
  metrics: Array<{ label: string; value: string | null }>
): string {
  const validMetrics = metrics
    .filter((m): m is { label: string; value: string } => m.value !== null)
    .map((m) => `${m.label}: ${m.value}`);

  return `$${ticker} ${title}\n\n${validMetrics.join('\n')}`;
}
