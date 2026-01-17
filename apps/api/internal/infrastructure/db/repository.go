package db

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// Repository provides CRUD operations for cache tables.
type Repository struct {
	db *gorm.DB
}

// NewRepository creates a new cache repository.
func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// GetStock retrieves a cached stock by ticker.
func (r *Repository) GetStock(ticker string) (*StockCache, error) {
	var stock StockCache
	result := r.db.First(&stock, "ticker = ?", ticker)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("querying stock cache: %w", result.Error)
	}
	return &stock, nil
}

// UpsertStock creates or updates a cached stock.
func (r *Repository) UpsertStock(stock *StockCache) error {
	stock.UpdatedAt = time.Now()
	if stock.CreatedAt.IsZero() {
		stock.CreatedAt = time.Now()
	}

	result := r.db.Save(stock)
	if result.Error != nil {
		return fmt.Errorf("upserting stock cache: %w", result.Error)
	}
	return nil
}

// GetStocksBySector retrieves all cached stocks in a sector.
func (r *Repository) GetStocksBySector(sector string) ([]StockCache, error) {
	var stocks []StockCache
	result := r.db.Where("sector = ?", sector).Find(&stocks)
	if result.Error != nil {
		return nil, fmt.Errorf("querying stocks by sector: %w", result.Error)
	}
	return stocks, nil
}

// GetStaleStocks retrieves stocks that haven't been updated recently.
func (r *Repository) GetStaleStocks(olderThan time.Duration) ([]StockCache, error) {
	cutoff := time.Now().Add(-olderThan)
	var stocks []StockCache
	result := r.db.Where("updated_at < ?", cutoff).Find(&stocks)
	if result.Error != nil {
		return nil, fmt.Errorf("querying stale stocks: %w", result.Error)
	}
	return stocks, nil
}

// DeleteStock removes a stock from cache.
func (r *Repository) DeleteStock(ticker string) error {
	result := r.db.Delete(&StockCache{}, "ticker = ?", ticker)
	if result.Error != nil {
		return fmt.Errorf("deleting stock cache: %w", result.Error)
	}
	return nil
}

// GetQuote retrieves a cached quote by ticker.
func (r *Repository) GetQuote(ticker string) (*QuoteCache, error) {
	var quote QuoteCache
	result := r.db.First(&quote, "ticker = ?", ticker)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("querying quote cache: %w", result.Error)
	}
	return &quote, nil
}

// UpsertQuote creates or updates a cached quote.
func (r *Repository) UpsertQuote(quote *QuoteCache) error {
	quote.UpdatedAt = time.Now()

	result := r.db.Save(quote)
	if result.Error != nil {
		return fmt.Errorf("upserting quote cache: %w", result.Error)
	}
	return nil
}

// DeleteQuote removes a quote from cache.
func (r *Repository) DeleteQuote(ticker string) error {
	result := r.db.Delete(&QuoteCache{}, "ticker = ?", ticker)
	if result.Error != nil {
		return fmt.Errorf("deleting quote cache: %w", result.Error)
	}
	return nil
}
