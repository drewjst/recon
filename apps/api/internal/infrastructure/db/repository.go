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

// DeleteStock removes a cached stock by ticker.
func (r *Repository) DeleteStock(ticker string) error {
	result := r.db.Where("ticker = ?", ticker).Delete(&StockCache{})
	if result.Error != nil {
		return fmt.Errorf("deleting stock cache: %w", result.Error)
	}
	return nil
}

// DeleteAllStocks removes all cached stocks.
func (r *Repository) DeleteAllStocks() error {
	result := r.db.Exec("TRUNCATE TABLE stock_caches")
	if result.Error != nil {
		return fmt.Errorf("truncating stock cache: %w", result.Error)
	}
	return nil
}
