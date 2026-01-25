import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = { width: 1200, height: 630 };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface StockData {
  company: { ticker: string; name: string };
  scores?: {
    piotroski: { score: number };
    ruleOf40: { score: number; passed: boolean };
    altmanZ: { score: number; zone: string };
  };
}

function getOverallGrade(scores: StockData['scores']): { grade: string; color: string } {
  if (!scores) return { grade: 'N/A', color: '#6b7280' };

  const piotroski = scores.piotroski.score;
  const ruleOf40Passed = scores.ruleOf40.passed;
  const altmanZone = scores.altmanZ.zone;

  let points = 0;
  if (piotroski >= 7) points += 2;
  else if (piotroski >= 4) points += 1;
  if (ruleOf40Passed) points += 1;
  if (altmanZone === 'safe') points += 2;
  else if (altmanZone === 'gray') points += 1;

  if (points >= 5) return { grade: 'A', color: '#22c55e' };
  if (points >= 4) return { grade: 'B', color: '#84cc16' };
  if (points >= 3) return { grade: 'C', color: '#eab308' };
  if (points >= 2) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: '#ef4444' };
}

async function getStockData(ticker: string): Promise<StockData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stock/${ticker.toUpperCase()}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { tickers: string[] } }
) {
  const tickers = params.tickers.map((t) => t.toUpperCase()).slice(0, 4);

  // Fetch all stock data in parallel
  const stocksData = await Promise.all(tickers.map(getStockData));

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
        {/* Header */}
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
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: '-1px',
              }}
            >
              Stock Comparison
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#94a3b8',
                marginTop: '8px',
              }}
            >
              {tickers.join(' vs ')}
            </div>
          </div>

          {/* Crux branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#f97316',
                letterSpacing: '-1px',
              }}
            >
              cruxit
            </div>
            <div style={{ fontSize: '18px', color: '#64748b' }}>.finance</div>
          </div>
        </div>

        {/* Stock cards side by side */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            flex: 1,
          }}
        >
          {tickers.map((ticker, index) => {
            const data = stocksData[index];
            const { grade, color: gradeColor } = getOverallGrade(data?.scores);
            const piotroski = data?.scores?.piotroski.score ?? 0;

            return (
              <div
                key={ticker}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#1e293b',
                  borderRadius: '20px',
                  padding: '32px',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {/* Ticker */}
                <div
                  style={{
                    fontSize: '40px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: '8px',
                  }}
                >
                  {ticker}
                </div>

                {/* Company name */}
                <div
                  style={{
                    fontSize: '16px',
                    color: '#94a3b8',
                    marginBottom: '24px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {data?.company.name ?? 'Loading...'}
                </div>

                {/* Grade */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: 'auto',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                    GRADE
                  </div>
                  <div
                    style={{
                      fontSize: '64px',
                      fontWeight: 'bold',
                      color: gradeColor,
                      lineHeight: 1,
                    }}
                  >
                    {grade}
                  </div>
                </div>

                {/* Piotroski score */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#64748b' }}>Piotroski</span>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: piotroski >= 7 ? '#22c55e' : piotroski >= 4 ? '#eab308' : '#ef4444',
                    }}
                  >
                    {piotroski}/9
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '24px',
          }}
        >
          <div style={{ fontSize: '16px', color: '#64748b' }}>
            Compare fundamentals side-by-side
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
