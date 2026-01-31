import { ImageResponse } from 'next/og';
import type { StockDetailResponse } from '@recon/shared';

export const runtime = 'edge';
export const alt = 'Stock Analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getOverallGrade(scores: StockDetailResponse['scores']): { grade: string; color: string } {
  if (!scores) return { grade: 'N/A', color: '#6b7280' };

  const piotroski = scores.piotroski.score;
  const ruleOf40Passed = scores.ruleOf40.passed;
  const altmanZone = scores.altmanZ.zone;

  // Calculate grade based on composite score
  let points = 0;

  // Piotroski: 0-3 = 0pts, 4-6 = 1pt, 7-9 = 2pts
  if (piotroski >= 7) points += 2;
  else if (piotroski >= 4) points += 1;

  // Rule of 40: passed = 1pt
  if (ruleOf40Passed) points += 1;

  // Altman Z: safe = 2pts, gray = 1pt, distress = 0pts
  if (altmanZone === 'safe') points += 2;
  else if (altmanZone === 'gray') points += 1;

  // Total possible: 5 points
  // A = 5, B = 4, C = 3, D = 2, F = 0-1
  if (points >= 5) return { grade: 'A', color: '#22c55e' };
  if (points >= 4) return { grade: 'B', color: '#84cc16' };
  if (points >= 3) return { grade: 'C', color: '#eab308' };
  if (points >= 2) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: '#ef4444' };
}

export default async function Image({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();

  let data: StockDetailResponse | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/stock/${ticker}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // Fall back to basic display
  }

  const companyName = data?.company.name ?? ticker;
  const sector = data?.company.sector ?? '';
  const piotroski = data?.scores?.piotroski.score ?? 0;
  const ruleOf40 = data?.scores?.ruleOf40.score ?? 0;
  const ruleOf40Passed = data?.scores?.ruleOf40.passed ?? false;
  const { grade, color: gradeColor } = getOverallGrade(data?.scores);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header with logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: '-2px',
              }}
            >
              {ticker}
            </div>
            <div
              style={{
                fontSize: '28px',
                color: '#94a3b8',
                marginTop: '8px',
                maxWidth: '600px',
              }}
            >
              {companyName}
            </div>
            {sector && (
              <div
                style={{
                  fontSize: '20px',
                  color: '#64748b',
                  marginTop: '8px',
                }}
              >
                {sector}
              </div>
            )}
          </div>

          {/* Grade badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              borderRadius: '20px',
              padding: '24px 40px',
            }}
          >
            <div style={{ fontSize: '18px', color: '#64748b', marginBottom: '8px' }}>
              GRADE
            </div>
            <div
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                color: gradeColor,
                lineHeight: 1,
              }}
            >
              {grade}
            </div>
          </div>
        </div>

        {/* Score boxes */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: 'auto',
            marginBottom: '40px',
          }}
        >
          {/* Piotroski */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              padding: '24px 32px',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px' }}>
              PIOTROSKI F-SCORE
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: piotroski >= 7 ? '#22c55e' : piotroski >= 4 ? '#eab308' : '#ef4444',
              }}
            >
              {piotroski}/9
            </div>
            <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '4px' }}>
              {piotroski >= 7 ? 'Strong' : piotroski >= 4 ? 'Moderate' : 'Weak'}
            </div>
          </div>

          {/* Rule of 40 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              padding: '24px 32px',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px' }}>
              RULE OF 40
            </div>
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: ruleOf40Passed ? '#22c55e' : '#ef4444',
              }}
            >
              {ruleOf40.toFixed(0)}%
            </div>
            <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '4px' }}>
              {ruleOf40Passed ? 'Passed' : 'Failed'}
            </div>
          </div>

          {/* Altman Z */}
          {data?.scores?.altmanZ && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '24px 32px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px' }}>
                ALTMAN Z-SCORE
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color:
                    data.scores.altmanZ.zone === 'safe'
                      ? '#22c55e'
                      : data.scores.altmanZ.zone === 'gray'
                      ? '#eab308'
                      : '#ef4444',
                }}
              >
                {data.scores.altmanZ.score.toFixed(1)}
              </div>
              <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '4px' }}>
                {data.scores.altmanZ.zone === 'safe'
                  ? 'Safe Zone'
                  : data.scores.altmanZ.zone === 'gray'
                  ? 'Gray Zone'
                  : 'Distress'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Crux wordmark */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#f97316',
                letterSpacing: '-1px',
              }}
            >
              cruxit
            </div>
            <div style={{ fontSize: '20px', color: '#64748b' }}>
              .finance
            </div>
          </div>
          <div style={{ fontSize: '18px', color: '#64748b' }}>
            Stock Analysis & Scoring
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
