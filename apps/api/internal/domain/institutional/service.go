// Package institutional provides institutional ownership analysis.
package institutional

import (
	"context"
	"fmt"
	"log/slog"
	"sort"

	"github.com/drewjst/crux/apps/api/internal/domain/models"
	"github.com/drewjst/crux/apps/api/internal/domain/utils"
	"github.com/drewjst/crux/apps/api/internal/infrastructure/providers/fmp"
	"golang.org/x/sync/errgroup"
)

const (
	// HistoricalQuarters is the number of quarters to fetch for ownership trend.
	HistoricalQuarters = 8 // 2 years
	// TopHoldersLimit is the number of top holders to return.
	TopHoldersLimit = 10
	// ActivityLimit is the number of items in each activity quadrant.
	ActivityLimit = 5
)

// Service provides institutional ownership analysis.
type Service struct {
	fmpClient *fmp.Client
}

// NewService creates a new institutional service.
func NewService(fmpClient *fmp.Client) *Service {
	return &Service{fmpClient: fmpClient}
}

// GetDetail returns comprehensive institutional ownership data.
func (s *Service) GetDetail(ctx context.Context, ticker string) (*models.InstitutionalDetail, error) {
	var (
		holders   []fmp.InstitutionalOwnershipHolder
		summary   *fmp.InstitutionalPositionsSummary
		history   []fmp.InstitutionalPositionsSummary
		breakdown []fmp.InstitutionalHolderBreakdown
	)

	// Get the most recent quarter with complete 13F data
	year, quarter := utils.GetMostRecentFilingQuarter()

	slog.Info("fetching institutional data", "ticker", ticker, "year", year, "quarter", quarter)

	g, gctx := errgroup.WithContext(ctx)

	// Fetch top holders
	g.Go(func() error {
		var err error
		holders, err = s.fmpClient.GetInstitutionalHolders(gctx, ticker, year, quarter, 50)
		if err != nil {
			// Try previous quarter if current fails
			prevYear, prevQuarter := utils.PreviousQuarter(year, quarter)
			holders, err = s.fmpClient.GetInstitutionalHolders(gctx, ticker, prevYear, prevQuarter, 50)
			if err != nil {
				slog.Warn("failed to fetch institutional holders", "ticker", ticker, "error", err)
			}
		}
		return nil
	})

	// Fetch current summary
	g.Go(func() error {
		var err error
		summary, err = s.fmpClient.GetInstitutionalPositionsSummary(gctx, ticker, year, quarter)
		if err != nil {
			prevYear, prevQuarter := utils.PreviousQuarter(year, quarter)
			summary, _ = s.fmpClient.GetInstitutionalPositionsSummary(gctx, ticker, prevYear, prevQuarter)
		}
		return nil
	})

	// Fetch historical ownership
	g.Go(func() error {
		var err error
		history, err = s.fmpClient.GetInstitutionalOwnershipHistory(gctx, ticker, HistoricalQuarters)
		if err != nil {
			slog.Warn("failed to fetch institutional history", "ticker", ticker, "error", err)
		}
		return nil
	})

	// Fetch holder type breakdown
	g.Go(func() error {
		var err error
		breakdown, err = s.fmpClient.GetInstitutionalHolderBreakdown(gctx, ticker, year, quarter)
		if err != nil {
			prevYear, prevQuarter := utils.PreviousQuarter(year, quarter)
			breakdown, _ = s.fmpClient.GetInstitutionalHolderBreakdown(gctx, ticker, prevYear, prevQuarter)
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("fetching institutional data: %w", err)
	}

	// Build the response
	return s.buildDetail(ticker, holders, summary, history, breakdown), nil
}

func (s *Service) buildDetail(
	ticker string,
	holders []fmp.InstitutionalOwnershipHolder,
	summary *fmp.InstitutionalPositionsSummary,
	history []fmp.InstitutionalPositionsSummary,
	breakdown []fmp.InstitutionalHolderBreakdown,
) *models.InstitutionalDetail {
	result := &models.InstitutionalDetail{
		Ticker:  ticker,
		Signals: []models.InstitutionalSignal{},
	}

	// Ownership overview from summary
	if summary != nil {
		result.OwnershipPercent = summary.OwnershipPercent
		result.OwnershipPercentChange = summary.OwnershipPercent - summary.LastOwnershipPercent
		result.TotalHolders = summary.InvestorsHolding
	}

	// Build ownership history
	result.OwnershipHistory = s.buildOwnershipHistory(history)

	// Build holder type breakdown
	result.HolderTypeBreakdown = s.buildHolderTypeBreakdown(breakdown)

	// Process holders
	if len(holders) > 0 {
		// Convert to detail format
		holderDetails := make([]models.InstitutionalHolderDetail, 0, len(holders))
		var newPositions, closedPositions, increases, decreases []models.InstitutionalHolderDetail
		var holdersIncreased, holdersDecreased, holdersNew, holdersClosed int

		for i, h := range holders {
			detail := models.InstitutionalHolderDetail{
				Rank:          i + 1,
				Name:          h.InvestorName,
				CIK:           h.CIK,
				Shares:        h.Shares,
				Value:         h.Value,
				PercentOwned:  h.OwnershipPercent,
				ChangeShares:  h.SharesChange,
				ChangePercent: h.ChangePercentage,
				IsNew:         h.IsNewPosition,
				IsSoldOut:     h.IsSoldOut,
				DateReported:  h.Date,
			}
			holderDetails = append(holderDetails, detail)

			// Categorize for activity
			if h.IsNewPosition {
				holdersNew++
				newPositions = append(newPositions, detail)
			} else if h.IsSoldOut {
				holdersClosed++
				closedPositions = append(closedPositions, detail)
			} else if h.ChangePercentage > 0 {
				holdersIncreased++
				increases = append(increases, detail)
			} else if h.ChangePercentage < 0 {
				holdersDecreased++
				decreases = append(decreases, detail)
			}
		}

		result.HoldersIncreased = holdersIncreased
		result.HoldersDecreased = holdersDecreased
		result.HoldersNew = holdersNew
		result.HoldersClosed = holdersClosed

		// Top 10 holders
		if len(holderDetails) > TopHoldersLimit {
			result.TopHolders = holderDetails[:TopHoldersLimit]
		} else {
			result.TopHolders = holderDetails
		}

		// Sort and limit activity lists
		sort.Slice(increases, func(i, j int) bool {
			return increases[i].ChangePercent > increases[j].ChangePercent
		})
		sort.Slice(decreases, func(i, j int) bool {
			return decreases[i].ChangePercent < decreases[j].ChangePercent
		})

		result.NewPositions = limitSlice(newPositions, ActivityLimit)
		result.ClosedPositions = limitSlice(closedPositions, ActivityLimit)
		result.BiggestIncreases = limitSlice(increases, ActivityLimit)
		result.BiggestDecreases = limitSlice(decreases, ActivityLimit)
	}

	// Generate signals
	result.Signals = s.generateSignals(result)

	return result
}

func (s *Service) buildOwnershipHistory(history []fmp.InstitutionalPositionsSummary) []models.OwnershipHistoryPoint {
	points := make([]models.OwnershipHistoryPoint, 0, len(history))
	for _, h := range history {
		points = append(points, models.OwnershipHistoryPoint{
			Date:             fmt.Sprintf("%d-Q%d", h.Year, h.Quarter),
			Year:             h.Year,
			Quarter:          h.Quarter,
			OwnershipPercent: h.OwnershipPercent,
			HolderCount:      h.InvestorsHolding,
			TotalShares:      h.TotalShares,
		})
	}
	// Reverse to chronological order (oldest first)
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}
	return points
}

func (s *Service) buildHolderTypeBreakdown(breakdown []fmp.InstitutionalHolderBreakdown) []models.HolderTypeBreakdown {
	types := make([]models.HolderTypeBreakdown, 0, len(breakdown))
	for _, b := range breakdown {
		types = append(types, models.HolderTypeBreakdown{
			HolderType:       b.HolderType,
			InvestorCount:    b.InvestorCount,
			OwnershipPercent: b.OwnershipPercent,
			TotalShares:      b.TotalShares,
			TotalValue:       b.TotalValue,
			SharesChange:     b.SharesChange,
			ChangePercent:    b.SharesChangePercent,
		})
	}
	// Sort by ownership percent descending
	sort.Slice(types, func(i, j int) bool {
		return types[i].OwnershipPercent > types[j].OwnershipPercent
	})
	return types
}

func (s *Service) generateSignals(data *models.InstitutionalDetail) []models.InstitutionalSignal {
	signals := []models.InstitutionalSignal{}

	// Ownership change signal
	if data.OwnershipPercentChange > 2 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bullish",
			Title:       "Institutional Accumulation",
			Description: fmt.Sprintf("Ownership increased %.1f%% QoQ", data.OwnershipPercentChange),
		})
	} else if data.OwnershipPercentChange < -2 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bearish",
			Title:       "Institutional Distribution",
			Description: fmt.Sprintf("Ownership decreased %.1f%% QoQ", -data.OwnershipPercentChange),
		})
	}

	// New positions vs closed positions
	if data.HoldersNew > data.HoldersClosed && data.HoldersNew > 3 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bullish",
			Title:       "New Interest",
			Description: fmt.Sprintf("%d new institutional positions opened", data.HoldersNew),
		})
	} else if data.HoldersClosed > data.HoldersNew && data.HoldersClosed > 3 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bearish",
			Title:       "Position Exits",
			Description: fmt.Sprintf("%d institutions closed their positions", data.HoldersClosed),
		})
	}

	// Increased vs decreased holders
	if data.HoldersIncreased > data.HoldersDecreased*2 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bullish",
			Title:       "Broad Accumulation",
			Description: fmt.Sprintf("%d holders increased vs %d decreased", data.HoldersIncreased, data.HoldersDecreased),
		})
	} else if data.HoldersDecreased > data.HoldersIncreased*2 {
		signals = append(signals, models.InstitutionalSignal{
			Type:        "bearish",
			Title:       "Broad Distribution",
			Description: fmt.Sprintf("%d holders decreased vs %d increased", data.HoldersDecreased, data.HoldersIncreased),
		})
	}

	// Ownership trend from history
	if len(data.OwnershipHistory) >= 4 {
		first := data.OwnershipHistory[0].OwnershipPercent
		last := data.OwnershipHistory[len(data.OwnershipHistory)-1].OwnershipPercent
		change := last - first
		if change > 5 {
			signals = append(signals, models.InstitutionalSignal{
				Type:        "bullish",
				Title:       "Sustained Accumulation",
				Description: fmt.Sprintf("Ownership up %.1f%% over 2 years", change),
			})
		} else if change < -5 {
			signals = append(signals, models.InstitutionalSignal{
				Type:        "bearish",
				Title:       "Sustained Distribution",
				Description: fmt.Sprintf("Ownership down %.1f%% over 2 years", -change),
			})
		}
	}

	return signals
}

func limitSlice(s []models.InstitutionalHolderDetail, max int) []models.InstitutionalHolderDetail {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
