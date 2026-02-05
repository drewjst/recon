package cache

import (
	"testing"
	"time"
)

func TestIsMarketOpenAt(t *testing.T) {
	tests := []struct {
		name string
		time time.Time
		want bool
	}{
		{
			name: "monday 10am ET",
			time: time.Date(2026, 2, 2, 10, 0, 0, 0, nyLoc), // Monday
			want: true,
		},
		{
			name: "monday 9:30am ET (market open)",
			time: time.Date(2026, 2, 2, 9, 30, 0, 0, nyLoc),
			want: true,
		},
		{
			name: "monday 9:29am ET (before open)",
			time: time.Date(2026, 2, 2, 9, 29, 0, 0, nyLoc),
			want: false,
		},
		{
			name: "monday 4:00pm ET (market close)",
			time: time.Date(2026, 2, 2, 16, 0, 0, 0, nyLoc),
			want: false,
		},
		{
			name: "monday 3:59pm ET (last minute)",
			time: time.Date(2026, 2, 2, 15, 59, 0, 0, nyLoc),
			want: true,
		},
		{
			name: "saturday noon",
			time: time.Date(2026, 2, 7, 12, 0, 0, 0, nyLoc), // Saturday
			want: false,
		},
		{
			name: "sunday noon",
			time: time.Date(2026, 2, 8, 12, 0, 0, 0, nyLoc), // Sunday
			want: false,
		},
		{
			name: "friday 2pm ET",
			time: time.Date(2026, 2, 6, 14, 0, 0, 0, nyLoc), // Friday
			want: true,
		},
		{
			name: "wednesday 8pm ET (after hours)",
			time: time.Date(2026, 2, 4, 20, 0, 0, 0, nyLoc),
			want: false,
		},
		{
			name: "UTC time maps correctly to ET",
			// 3pm UTC = 10am ET in February (EST = UTC-5)
			time: time.Date(2026, 2, 2, 15, 0, 0, 0, time.UTC),
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isMarketOpenAt(tt.time)
			if got != tt.want {
				t.Errorf("isMarketOpenAt(%v) = %v, want %v", tt.time, got, tt.want)
			}
		})
	}
}

func TestCacheConfig_EffectiveTTL(t *testing.T) {
	// Test that the registry entries have expected values
	snapshot, ok := CacheConfigs["snapshot"]
	if !ok {
		t.Fatal("expected snapshot config to exist")
	}
	if snapshot.TTL != 5*time.Minute {
		t.Errorf("snapshot TTL = %v, want 5m", snapshot.TTL)
	}
	if snapshot.Source != "massive" {
		t.Errorf("snapshot source = %q, want %q", snapshot.Source, "massive")
	}

	profile, ok := CacheConfigs["profile"]
	if !ok {
		t.Fatal("expected profile config to exist")
	}
	if profile.TTL != 7*24*time.Hour {
		t.Errorf("profile TTL = %v, want 7d", profile.TTL)
	}

	// FMP source should always return base TTL regardless of market state
	if profile.EffectiveTTL() != profile.TTL {
		t.Errorf("FMP EffectiveTTL = %v, want %v (base TTL)", profile.EffectiveTTL(), profile.TTL)
	}
}

func TestCacheConfig_MaxTTL(t *testing.T) {
	massive := CacheConfig{TTL: 5 * time.Minute, Source: "massive"}
	if massive.maxTTL() != 30*time.Minute {
		t.Errorf("massive maxTTL = %v, want 30m", massive.maxTTL())
	}

	fmpCfg := CacheConfig{TTL: 24 * time.Hour, Source: "fmp"}
	if fmpCfg.maxTTL() != 24*time.Hour {
		t.Errorf("fmp maxTTL = %v, want 24h", fmpCfg.maxTTL())
	}
}

func TestCacheConfigs_AllEntriesValid(t *testing.T) {
	validSources := map[string]bool{
		"massive":  true,
		"fmp":      true,
		"computed": true,
	}

	for name, cfg := range CacheConfigs {
		if cfg.TTL <= 0 {
			t.Errorf("config %q has non-positive TTL: %v", name, cfg.TTL)
		}
		if !validSources[cfg.Source] {
			t.Errorf("config %q has unknown source: %q", name, cfg.Source)
		}
	}
}
