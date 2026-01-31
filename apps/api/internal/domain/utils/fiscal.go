// Package utils provides shared utility functions for domain logic.
package utils

import "time"

// 13F filings are due 45 days after quarter end:
// Q1 (Mar 31) -> due May 15, Q2 (Jun 30) -> due Aug 14
// Q3 (Sep 30) -> due Nov 14, Q4 (Dec 31) -> due Feb 14

// GetMostRecentFilingQuarter returns the most recent quarter with complete 13F filings.
// This uses a conservative estimate based on filing deadlines.
func GetMostRecentFilingQuarter() (year int, quarter int) {
	return GetMostRecentFilingQuarterFor(time.Now())
}

// GetMostRecentFilingQuarterFor returns the most recent quarter with complete 13F filings
// for a given point in time. This is useful for testing.
func GetMostRecentFilingQuarterFor(now time.Time) (year int, quarter int) {
	year = now.Year()
	month := int(now.Month())

	// Determine the most recent quarter with COMPLETE data
	// We use conservative estimates to ensure major institutions have filed
	// In Q1 (Jan-Mar): Q3 of prev year is complete, Q4 may be incomplete until mid-Feb
	// In Q2 (Apr-Jun): Q4 of prev year is complete, Q1 may be incomplete until mid-May
	// In Q3 (Jul-Sep): Q1 is complete, Q2 may be incomplete until mid-Aug
	// In Q4 (Oct-Dec): Q2 is complete, Q3 may be incomplete until mid-Nov
	switch {
	case month <= 2: // Jan-Feb: use Q3 of previous year (safest)
		year--
		quarter = 3
	case month == 3: // March: Q4 should be available
		year--
		quarter = 4
	case month <= 5: // Apr-May: use Q4 of previous year
		year--
		quarter = 4
	case month == 6: // June: Q1 should be available
		quarter = 1
	case month <= 8: // Jul-Aug: use Q1
		quarter = 1
	case month == 9: // September: Q2 should be available
		quarter = 2
	case month <= 11: // Oct-Nov: use Q2
		quarter = 2
	default: // December: Q3 should be available
		quarter = 3
	}

	return year, quarter
}

// PreviousQuarter returns the quarter before the given year/quarter.
func PreviousQuarter(year, quarter int) (int, int) {
	quarter--
	if quarter < 1 {
		quarter = 4
		year--
	}
	return year, quarter
}

// QuarterEndDate returns the end date of a fiscal quarter.
func QuarterEndDate(year, quarter int) time.Time {
	switch quarter {
	case 1:
		return time.Date(year, 3, 31, 0, 0, 0, 0, time.UTC)
	case 2:
		return time.Date(year, 6, 30, 0, 0, 0, 0, time.UTC)
	case 3:
		return time.Date(year, 9, 30, 0, 0, 0, 0, time.UTC)
	default:
		return time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)
	}
}
