// Local development server — mirrors vercel.json rewrites using system Go.
// Usage: go run ./cmd/server --port 3000
package main

import (
	"flag"
	"log"
	"net/http"
	"strings"

	alertsHandler "keskealsaydim/api/alerts"
	authHandler "keskealsaydim/api/auth"
	compareHandler "keskealsaydim/api/compare"
	compareHistHandler "keskealsaydim/api/compare/history"
	compareSharedHandler "keskealsaydim/api/compare/shared"
	marketHandler "keskealsaydim/api/market"
	portfolioHandler "keskealsaydim/api/portfolio"
	portfolioItemHandler "keskealsaydim/api/portfolio/item"
	stocksHandler "keskealsaydim/api/stocks"
	usersHandler "keskealsaydim/api/users"
	watchlistHandler "keskealsaydim/api/watchlist"
	watchlistItemHandler "keskealsaydim/api/watchlist/item"
)

func main() {
	port := flag.String("port", "3000", "Port to listen on")
	flag.Parse()

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/api/auth", authHandler.Handler)
	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"action": "login"})
		authHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"action": "register"})
		authHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"action": "refresh"})
		authHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"action": "logout"})
		authHandler.Handler(w, r)
	})

	// Stocks routes
	mux.HandleFunc("/api/stocks", stocksHandler.Handler)
	mux.HandleFunc("/api/stocks/search", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{
			"action": "search",
			"q":      r.URL.Query().Get("q"),
		})
		stocksHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/stocks/", func(w http.ResponseWriter, r *http.Request) {
		// /api/stocks/{symbol}/price  or  /api/stocks/{symbol}/history
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/stocks/"), "/")
		if len(parts) < 2 {
			http.NotFound(w, r)
			return
		}
		symbol := parts[0]
		action := parts[1]
		setQueryValues(r, map[string]string{
			"action": action,
			"symbol": symbol,
		})
		stocksHandler.Handler(w, r)
	})

	// Compare routes
	mux.HandleFunc("/api/compare/shared/", func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.URL.Path, "/api/compare/shared/")
		setQueryValues(r, map[string]string{"token": token})
		compareSharedHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/compare/scenarios/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/compare/scenarios/")
		setQueryValues(r, map[string]string{"id": id})
		compareHistHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/compare/history", func(w http.ResponseWriter, r *http.Request) {
		compareHistHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/compare", func(w http.ResponseWriter, r *http.Request) {
		compareHandler.Handler(w, r)
	})

	// Market route
	mux.HandleFunc("/api/market/overview", marketHandler.Handler)

	// Portfolio routes
	mux.HandleFunc("/api/portfolio/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/portfolio/")
		setQueryValues(r, map[string]string{"id": id})
		portfolioItemHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/portfolio", portfolioHandler.Handler)

	// Watchlist routes
	mux.HandleFunc("/api/watchlist/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/watchlist/")
		setQueryValues(r, map[string]string{"id": id})
		watchlistItemHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/watchlist", watchlistHandler.Handler)

	// Users routes
	mux.HandleFunc("/api/users/me", usersHandler.Handler)
	mux.HandleFunc("/api/users/password", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"action": "password"})
		usersHandler.Handler(w, r)
	})

	// Alerts & notifications share one handler, matching the Vercel rewrites.
	mux.HandleFunc("/api/notifications", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"resource": "notifications"})
		alertsHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/notifications/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/notifications/")
		setQueryValues(r, map[string]string{"resource": "notifications", "id": id})
		alertsHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/alerts", func(w http.ResponseWriter, r *http.Request) {
		setQueryValues(r, map[string]string{"resource": "alerts"})
		alertsHandler.Handler(w, r)
	})
	mux.HandleFunc("/api/alerts/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/alerts/")
		setQueryValues(r, map[string]string{"resource": "alerts", "id": id})
		alertsHandler.Handler(w, r)
	})

	// Local-only health check for smoke tests. Not deployed: the project is at
	// Vercel Hobby's 12-function ceiling, so this does not get its own handler.
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	log.Printf("Local dev server running on http://localhost:%s", *port)
	log.Fatal(http.ListenAndServe(":"+*port, mux))
}

func setQueryValues(r *http.Request, values map[string]string) {
	query := r.URL.Query()
	for key, value := range values {
		query.Set(key, value)
	}
	r.URL.RawQuery = query.Encode()
}
