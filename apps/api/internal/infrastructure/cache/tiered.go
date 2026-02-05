// Package cache provides a tiered caching layer with market-aware TTLs.
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"github.com/drewjst/crux/apps/api/internal/infrastructure/db"
)

const offMarketMultiplier = 6

// CacheConfig defines caching behavior for a single data type.
type CacheConfig struct {
	TTL    time.Duration
	Source string // "massive", "fmp", or "computed"
}

// EffectiveTTL returns the TTL adjusted for market hours.
// Massive (price) data TTLs are multiplied by 6 when the market is closed,
// since prices don't change outside trading hours.
func (c CacheConfig) EffectiveTTL() time.Duration {
	if c.Source == "massive" && !isMarketOpen() {
		return c.TTL * offMarketMultiplier
	}
	return c.TTL
}

// maxTTL returns the longest possible TTL for this config (used for ExpiresAt).
func (c CacheConfig) maxTTL() time.Duration {
	if c.Source == "massive" {
		return c.TTL * offMarketMultiplier
	}
	return c.TTL
}

// CacheConfigs maps data type strings to their cache configuration.
var CacheConfigs = map[string]CacheConfig{
	// Massive (price) data — fresh during market hours
	"snapshot":   {TTL: 5 * time.Minute, Source: "massive"},
	"daily_bars": {TTL: 24 * time.Hour, Source: "massive"},
	"sma_20":     {TTL: 15 * time.Minute, Source: "massive"},
	"sma_50":     {TTL: 15 * time.Minute, Source: "massive"},
	"sma_200":    {TTL: 1 * time.Hour, Source: "massive"},
	"rsi_14":     {TTL: 15 * time.Minute, Source: "massive"},

	// FMP (fundamental) data — changes infrequently
	"profile":    {TTL: 7 * 24 * time.Hour, Source: "fmp"},
	"ratios_ttm": {TTL: 24 * time.Hour, Source: "fmp"},
	"screener":   {TTL: 24 * time.Hour, Source: "fmp"},

	// Computed data
	"sector_overview": {TTL: 15 * time.Minute, Source: "computed"},
	"rs_rank":         {TTL: 24 * time.Hour, Source: "computed"},
}

// TieredCache provides data-type-aware caching with market-sensitive TTLs.
type TieredCache interface {
	Get(ctx context.Context, dataType string, key string, dest interface{}) (bool, error)
	Set(ctx context.Context, dataType string, key string, value interface{}) error
	Invalidate(ctx context.Context, dataType string, key string) error
}

// tieredCache implements TieredCache using the existing provider_cache table.
type tieredCache struct {
	db *gorm.DB
}

// NewTieredCache creates a new tiered cache backed by PostgreSQL.
func NewTieredCache(database *gorm.DB) TieredCache {
	return &tieredCache{db: database}
}

// Get retrieves a cached value. Returns (true, nil) on hit, (false, nil) on miss.
// Expiration is computed dynamically: UpdatedAt + EffectiveTTL must be after now.
func (c *tieredCache) Get(ctx context.Context, dataType string, key string, dest interface{}) (bool, error) {
	var entry db.ProviderCache
	result := c.db.WithContext(ctx).
		First(&entry, "data_type = ? AND key = ?", dataType, key)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, fmt.Errorf("querying tiered cache [%s:%s]: %w", dataType, key, result.Error)
	}

	// Compute dynamic expiration based on current market state
	cfg, ok := CacheConfigs[dataType]
	if !ok {
		slog.Warn("unknown cache data type, treating as expired", "dataType", dataType)
		return false, nil
	}

	expiresAt := entry.UpdatedAt.Add(cfg.EffectiveTTL())
	if time.Now().After(expiresAt) {
		return false, nil
	}

	if err := json.Unmarshal(entry.Data, dest); err != nil {
		return false, fmt.Errorf("unmarshaling cached [%s:%s]: %w", dataType, key, err)
	}

	return true, nil
}

// Set stores a value in the cache. The ExpiresAt column is set to the maximum
// possible TTL so the existing cleanup job can eventually remove truly stale entries.
func (c *tieredCache) Set(ctx context.Context, dataType string, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshaling value for [%s:%s]: %w", dataType, key, err)
	}

	cfg, ok := CacheConfigs[dataType]
	if !ok {
		return fmt.Errorf("unknown cache data type: %s", dataType)
	}

	now := time.Now()
	entry := db.ProviderCache{
		DataType:  dataType,
		Key:       key,
		Data:      datatypes.JSON(data),
		Provider:  cfg.Source,
		UpdatedAt: now,
		ExpiresAt: now.Add(cfg.maxTTL()),
	}

	result := c.db.WithContext(ctx).Save(&entry)
	if result.Error != nil {
		return fmt.Errorf("upserting tiered cache [%s:%s]: %w", dataType, key, result.Error)
	}

	return nil
}

// Invalidate removes a cached entry.
func (c *tieredCache) Invalidate(ctx context.Context, dataType string, key string) error {
	result := c.db.WithContext(ctx).
		Where("data_type = ? AND key = ?", dataType, key).
		Delete(&db.ProviderCache{})

	if result.Error != nil {
		return fmt.Errorf("invalidating tiered cache [%s:%s]: %w", dataType, key, result.Error)
	}

	return nil
}

// nyLoc is the America/New_York timezone, loaded once at init.
var nyLoc *time.Location

func init() {
	var err error
	nyLoc, err = time.LoadLocation("America/New_York")
	if err != nil {
		// Fall back to UTC-5 offset if timezone data is unavailable
		nyLoc = time.FixedZone("EST", -5*60*60)
	}
}

// MarketOpenHour and MarketCloseHour define US equity market hours in ET.
const (
	MarketOpenHour    = 9
	MarketOpenMinute  = 30
	MarketCloseHour   = 16
	MarketCloseMinute = 0
)

// isMarketOpen returns true if the US equity market is currently in regular
// trading hours: Monday–Friday, 9:30 AM – 4:00 PM Eastern Time.
// Does not account for holidays.
func isMarketOpen() bool {
	return isMarketOpenAt(time.Now())
}

// isMarketOpenAt checks whether the market is open at a specific time.
// Exported for testing via the package-level function.
func isMarketOpenAt(t time.Time) bool {
	et := t.In(nyLoc)

	weekday := et.Weekday()
	if weekday == time.Saturday || weekday == time.Sunday {
		return false
	}

	minuteOfDay := et.Hour()*60 + et.Minute()
	marketOpen := MarketOpenHour*60 + MarketOpenMinute   // 9:30 = 570
	marketClose := MarketCloseHour*60 + MarketCloseMinute // 16:00 = 960

	return minuteOfDay >= marketOpen && minuteOfDay < marketClose
}
