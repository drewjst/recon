package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"gorm.io/gorm"
)

var startTime = time.Now()

// HealthHandler handles health check requests.
type HealthHandler struct {
	db *gorm.DB
}

// NewHealthHandler creates a new health check handler.
func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// HealthResponse represents the health check response.
type HealthResponse struct {
	Status    string        `json:"status"`
	Timestamp string        `json:"timestamp"`
	Version   string        `json:"version"`
	Uptime    string        `json:"uptime"`
	Checks    []HealthCheck `json:"checks"`
}

// HealthCheck represents an individual health check result.
type HealthCheck struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // "healthy", "degraded", "unhealthy"
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}

// Health handles GET /health requests.
// Returns the current health status of the service.
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	checks := []HealthCheck{}
	overallStatus := "healthy"

	// Database check
	if h.db != nil {
		dbCheck := h.checkDatabase()
		checks = append(checks, dbCheck)
		if dbCheck.Status == "unhealthy" {
			overallStatus = "degraded"
		}
	}

	// Calculate uptime
	uptime := time.Since(startTime)
	uptimeStr := formatDuration(uptime)

	response := HealthResponse{
		Status:    overallStatus,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "0.1.0",
		Uptime:    uptimeStr,
		Checks:    checks,
	}

	writeJSON(w, http.StatusOK, response)
}

// checkDatabase performs a database connectivity check.
func (h *HealthHandler) checkDatabase() HealthCheck {
	check := HealthCheck{
		Name:   "database",
		Status: "healthy",
	}

	start := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sqlDB, err := h.db.DB()
	if err != nil {
		check.Status = "unhealthy"
		check.Message = "failed to get database connection"
		return check
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		check.Status = "unhealthy"
		check.Message = "database ping failed"
		return check
	}

	check.Latency = time.Since(start).String()
	check.Message = "connected"
	return check
}

// formatDuration formats a duration into a human-readable string.
func formatDuration(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return formatTime(days, "d") + " " + formatTime(hours, "h") + " " + formatTime(minutes, "m")
	}
	if hours > 0 {
		return formatTime(hours, "h") + " " + formatTime(minutes, "m") + " " + formatTime(seconds, "s")
	}
	if minutes > 0 {
		return formatTime(minutes, "m") + " " + formatTime(seconds, "s")
	}
	return formatTime(seconds, "s")
}

func formatTime(value int, unit string) string {
	return fmt.Sprintf("%d%s", value, unit)
}
