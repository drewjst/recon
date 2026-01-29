package models

import "time"

// NewsArticle represents a news article from a data provider.
type NewsArticle struct {
	Symbol        string
	PublishedDate time.Time
	Title         string
	Text          string
	URL           string
	Site          string
}

// NewsSentiment represents AI-analyzed sentiment from news articles.
type NewsSentiment struct {
	Sentiment    string   `json:"sentiment"`    // positive, negative, neutral, mixed
	Confidence   float64  `json:"confidence"`   // 0.0-1.0
	Themes       []string `json:"themes"`       // 2-4 key themes
	Summary      string   `json:"summary"`      // max 80 chars
	ArticleCount int      `json:"articleCount"`
	DaysCovered  int      `json:"daysCovered"`
}
