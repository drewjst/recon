import { Suspense } from 'react';
import { SectorHeatmap } from '@/components/sectors';

export const metadata = {
  title: 'Sector Heatmap - Crux',
  description:
    'Explore stocks by GICS sector with heatmap-colored performance metrics, sparkline charts, and technical indicators.',
};

export default function SectorsPage() {
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={null}>
        <SectorHeatmap />
      </Suspense>
    </div>
  );
}
