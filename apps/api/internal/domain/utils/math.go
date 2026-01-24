// Package utils provides shared utility functions for domain logic.
package utils

import (
	"math"
	"sort"
)

// CalculateMedian returns the median of a slice of float64 values.
// Returns nil if the slice is empty.
func CalculateMedian(values []float64) *float64 {
	if len(values) == 0 {
		return nil
	}

	// Make a copy to avoid modifying the original slice
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	n := len(sorted)
	var median float64
	if n%2 == 0 {
		median = (sorted[n/2-1] + sorted[n/2]) / 2
	} else {
		median = sorted[n/2]
	}
	return &median
}

// CalculatePercentile calculates what percentile a value falls within a sorted slice.
// Returns a value from 0-100.
func CalculatePercentile(value float64, sortedValues []float64) float64 {
	if len(sortedValues) == 0 {
		return 50 // Default to middle if no comparison data
	}

	belowCount := 0
	for _, v := range sortedValues {
		if value > v {
			belowCount++
		}
	}

	return float64(belowCount) / float64(len(sortedValues)) * 100
}

// CalculatePercentileInRange calculates where a value falls within a min-max range.
// Returns a value from 0-100, clamped.
func CalculatePercentileInRange(value, min, max float64) float64 {
	if max <= min {
		return 50 // All same value
	}

	percentile := ((value - min) / (max - min)) * 100
	return math.Max(0, math.Min(100, percentile))
}

// Clamp restricts a value to be within the specified range.
func Clamp(value, min, max float64) float64 {
	return math.Max(min, math.Min(max, value))
}

// SafeDivide performs division with zero-check, returning 0 if divisor is 0.
func SafeDivide(numerator, denominator float64) float64 {
	if denominator == 0 {
		return 0
	}
	return numerator / denominator
}

// CalculateGrowthRate calculates percentage growth between two values.
// Returns nil if the base value is zero or negative.
func CalculateGrowthRate(current, previous float64) *float64 {
	if previous <= 0 {
		return nil
	}
	rate := ((current - previous) / previous) * 100
	return &rate
}
