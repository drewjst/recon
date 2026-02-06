package providers

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/db"
)

// MockCacheRepo mocks CacheRepository
type MockCacheRepo struct {
	GetFunc func(dataType, key string) (*db.ProviderCache, error)
	SetFunc func(cache *db.ProviderCache) error
}

func (m *MockCacheRepo) GetProviderCache(dataType, key string) (*db.ProviderCache, error) {
	if m.GetFunc != nil {
		return m.GetFunc(dataType, key)
	}
	return nil, nil // Cache miss
}

func (m *MockCacheRepo) SetProviderCache(cache *db.ProviderCache) error {
	if m.SetFunc != nil {
		return m.SetFunc(cache)
	}
	return nil
}

// MockFundamentalsProvider mocks FundamentalsProvider
type MockFundamentalsProvider struct {
	GetCompanyFunc func(ctx context.Context, ticker string) (*models.Company, error)
}

func (m *MockFundamentalsProvider) GetCompany(ctx context.Context, ticker string) (*models.Company, error) {
	if m.GetCompanyFunc != nil {
		return m.GetCompanyFunc(ctx, ticker)
	}
	return &models.Company{Ticker: ticker}, nil
}

func (m *MockFundamentalsProvider) GetFinancials(ctx context.Context, ticker string, periods int) ([]models.Financials, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetRatios(ctx context.Context, ticker string) (*models.Ratios, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetInstitutionalHolders(ctx context.Context, ticker string) ([]models.InstitutionalHolder, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetInstitutionalSummary(ctx context.Context, ticker string) (*models.InstitutionalSummary, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetInsiderTrades(ctx context.Context, ticker string, days int) ([]models.InsiderTrade, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetCongressTrades(ctx context.Context, ticker string, days int) ([]models.CongressTrade, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetDCF(ctx context.Context, ticker string) (*models.DCF, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetOwnerEarnings(ctx context.Context, ticker string) (*models.OwnerEarnings, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetIndustryAverages(ctx context.Context, industry string) (*models.IndustryAverages, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetTechnicalMetrics(ctx context.Context, ticker string) (*models.TechnicalMetrics, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetShortInterest(ctx context.Context, ticker string) (*models.ShortInterest, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetAnalystEstimates(ctx context.Context, ticker string) (*models.AnalystEstimates, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetStockPeers(ctx context.Context, ticker string) ([]string, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetQuarterlyRatios(ctx context.Context, ticker string, quarters int) ([]models.QuarterlyRatio, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetSectorPE(ctx context.Context, sector string, exchange string) (*models.SectorPE, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetIndustryPE(ctx context.Context, industry string, exchange string) (*models.IndustryPE, error) { return nil, nil }
func (m *MockFundamentalsProvider) IsETF(ctx context.Context, ticker string) (bool, error) { return false, nil }
func (m *MockFundamentalsProvider) GetETFData(ctx context.Context, ticker string) (*models.ETFData, error) { return nil, nil }
func (m *MockFundamentalsProvider) GetNews(ctx context.Context, ticker string, limit int) ([]models.NewsArticle, error) { return nil, nil }

// Test helper to capture logs
type LogCapture struct {
	records []slog.Record
}

func (l *LogCapture) Enabled(context.Context, slog.Level) bool { return true }
func (l *LogCapture) Handle(ctx context.Context, r slog.Record) error {
	l.records = append(l.records, r)
	return nil
}
func (l *LogCapture) WithAttrs(attrs []slog.Attr) slog.Handler { return l }
func (l *LogCapture) WithGroup(name string) slog.Handler { return l }

func TestCached_ErrorLogging(t *testing.T) {
	// Setup log capture
	capture := &LogCapture{}
	logger := slog.New(capture)
	originalLogger := slog.Default()
	slog.SetDefault(logger)
	defer slog.SetDefault(originalLogger)

	// Setup mocks
	mockRepo := &MockCacheRepo{
		SetFunc: func(cache *db.ProviderCache) error {
			return errors.New("simulated db error")
		},
	}
	mockProvider := &MockFundamentalsProvider{
		GetCompanyFunc: func(ctx context.Context, ticker string) (*models.Company, error) {
			return &models.Company{Ticker: ticker}, nil
		},
	}

	cachedProvider := NewCachedFundamentalsProvider(mockProvider, mockRepo, "test")

	// Call GetCompany (triggers cache set)
	_, err := cachedProvider.GetCompany(context.Background(), "AAPL")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Wait for async cache set
	time.Sleep(50 * time.Millisecond)

    // Verify error is logged
    found := false
    for _, r := range capture.records {
        if r.Message == "cache set failed" {
            found = true
            break
        }
    }
    if !found {
        t.Error("expected 'cache set failed' log, but not found")
    }
}

func BenchmarkCached_SetProviderCache(b *testing.B) {
	// Setup mocks
	mockRepo := &MockCacheRepo{
		SetFunc: func(cache *db.ProviderCache) error {
			time.Sleep(10 * time.Millisecond) // Simulate slow DB write
			return nil
		},
	}
	mockProvider := &MockFundamentalsProvider{
		GetCompanyFunc: func(ctx context.Context, ticker string) (*models.Company, error) {
			return &models.Company{Ticker: ticker}, nil
		},
	}

	cachedProvider := NewCachedFundamentalsProvider(mockProvider, mockRepo, "test")
    ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Call GetCompany (triggers cache set)
		_, _ = cachedProvider.GetCompany(ctx, "AAPL")
	}
}
