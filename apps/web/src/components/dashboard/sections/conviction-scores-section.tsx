'use client';

import { SectionCard } from './section-card';
import { Card } from '@/components/ui/card';
import type { StockDetailResponse } from '@recon/shared';

interface ConvictionScoresSectionProps {
  data: StockDetailResponse;
}

interface ScoreBoxProps {
  label: string;
  value: string;
  description: string;
  status: 'positive' | 'neutral' | 'negative';
}

function ScoreBox({ label, value, description, status }: ScoreBoxProps) {
  const statusColors = {
    positive: 'border-success/30 bg-success/5',
    neutral: 'border-border/50',
    negative: 'border-destructive/30 bg-destructive/5',
  };

  const valueColors = {
    positive: 'text-success',
    neutral: 'text-foreground',
    negative: 'text-destructive',
  };

  return (
    <Card className={`p-4 text-center transition-all duration-300 ${statusColors[status]}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono mb-1 ${valueColors[status]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </Card>
  );
}

export function ConvictionScoresSection({ data }: ConvictionScoresSectionProps) {
  const { scores } = data;

  const getPiotroskiStatus = (score: number): 'positive' | 'neutral' | 'negative' => {
    if (score >= 7) return 'positive';
    if (score >= 4) return 'neutral';
    return 'negative';
  };

  const getAltmanStatus = (zone: string): 'positive' | 'neutral' | 'negative' => {
    if (zone === 'safe') return 'positive';
    if (zone === 'gray') return 'neutral';
    return 'negative';
  };

  const getGradeStatus = (grade: string): 'positive' | 'neutral' | 'negative' => {
    if (['A', 'B+'].includes(grade)) return 'positive';
    if (['B', 'C'].includes(grade)) return 'neutral';
    return 'negative';
  };

  return (
    <SectionCard title="Conviction Scores">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreBox
          label="Piotroski"
          value={`${scores.piotroski.score}/9`}
          description={scores.piotroski.score >= 7 ? 'Strong' : scores.piotroski.score >= 4 ? 'Moderate' : 'Weak'}
          status={getPiotroskiStatus(scores.piotroski.score)}
        />
        <ScoreBox
          label="Rule of 40"
          value={`${scores.ruleOf40.score.toFixed(0)}%`}
          description={scores.ruleOf40.passed ? 'Passed' : 'Failed'}
          status={scores.ruleOf40.passed ? 'positive' : 'negative'}
        />
        <ScoreBox
          label="Altman Z"
          value={scores.altmanZ.score.toFixed(2)}
          description={scores.altmanZ.zone === 'safe' ? 'Safe Zone' : scores.altmanZ.zone === 'gray' ? 'Gray Zone' : 'Distress'}
          status={getAltmanStatus(scores.altmanZ.zone)}
        />
        <ScoreBox
          label="Overall"
          value={scores.overallGrade}
          description={scores.overallGrade === 'A' ? 'Excellent' : scores.overallGrade.startsWith('B') ? 'Good' : 'Average'}
          status={getGradeStatus(scores.overallGrade)}
        />
      </div>
    </SectionCard>
  );
}
