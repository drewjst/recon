// Package models defines canonical domain models that all providers map to.
package models

// Company represents core company information.
type Company struct {
	Ticker      string
	Name        string
	Exchange    string
	Sector      string
	Industry    string
	Description string
	Website     string
	CEO         string
	Employees   int
	Country     string
}
