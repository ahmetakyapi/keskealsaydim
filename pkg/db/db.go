package db

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool            *pgxpool.Pool
	lastHealthCheck time.Time
	poolMu          sync.Mutex
)

const (
	connectTimeoutSeconds = 8
	healthCheckInterval   = 15 * time.Second
	pingTimeout           = 5 * time.Second
	createRetryAttempts   = 3
	retryBaseDelay        = 350 * time.Millisecond
)

// Get returns the shared connection pool, creating it on first call and
// recreating it when the existing pool fails a health check.
func Get() (*pgxpool.Pool, error) {
	poolMu.Lock()
	defer poolMu.Unlock()

	if pool != nil && time.Since(lastHealthCheck) < healthCheckInterval {
		return pool, nil
	}

	if pool != nil {
		if err := pingPool(pool); err == nil {
			lastHealthCheck = time.Now()
			return pool, nil
		} else {
			log.Printf("db: existing pool unhealthy, recreating: %v", err)
			pool.Close()
			pool = nil
		}
	}

	p, err := connectWithRetry()
	if err != nil {
		return nil, fmt.Errorf("database connection unavailable: %w", err)
	}

	pool = p
	lastHealthCheck = time.Now()
	return pool, nil
}

func connectWithRetry() (*pgxpool.Pool, error) {
	var lastErr error
	for attempt := 1; attempt <= createRetryAttempts; attempt++ {
		p, err := openPool()
		if err == nil {
			return p, nil
		}

		lastErr = err
		log.Printf("db: connect attempt %d/%d failed: %v", attempt, createRetryAttempts, err)
		if attempt < createRetryAttempts {
			time.Sleep(time.Duration(attempt) * retryBaseDelay)
		}
	}

	return nil, lastErr
}

func openPool() (*pgxpool.Pool, error) {
	databaseURL, err := databaseURLFromEnv(os.Getenv)
	if err != nil {
		return nil, err
	}

	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	cfg.MaxConns = int32(readIntEnv("DB_MAX_CONNS", 4))
	cfg.MinConns = 0
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnLifetimeJitter = 5 * time.Minute
	cfg.HealthCheckPeriod = 30 * time.Second
	cfg.ConnConfig.ConnectTimeout = connectTimeoutSeconds * time.Second
	cfg.ConnConfig.RuntimeParams["application_name"] = "keskealsaydim-api"
	// Disable prepared statements for pgbouncer compatibility.
	cfg.ConnConfig.DefaultQueryExecMode = 3 // pgx.QueryExecModeSimpleProtocol

	p, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, err
	}

	if err := pingPool(p); err != nil {
		p.Close()
		return nil, err
	}

	return p, nil
}

func pingPool(p *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	return p.Ping(ctx)
}

func databaseURLFromEnv(getenv func(string) string) (string, error) {
	candidates := []string{
		firstNonEmpty(getenv, "DATABASE_URL"),
		firstNonEmpty(getenv, "POSTGRES_URL"),
		firstNonEmpty(getenv, "POSTGRES_PRISMA_URL"),
		firstNonEmpty(getenv, "POSTGRES_URL_NON_POOLING"),
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		return normalizeDatabaseURL(candidate)
	}

	if builtURL, ok := buildDatabaseURLFromParts(getenv); ok {
		return builtURL, nil
	}

	return "", errors.New("DATABASE_URL is not set")
}

func buildDatabaseURLFromParts(getenv func(string) string) (string, bool) {
	host := firstNonEmpty(getenv, "PGHOST", "POSTGRES_HOST")
	database := firstNonEmpty(getenv, "PGDATABASE", "POSTGRES_DB")
	user := firstNonEmpty(getenv, "PGUSER", "POSTGRES_USER")
	if host == "" || database == "" || user == "" {
		return "", false
	}

	port := firstNonEmpty(getenv, "PGPORT", "POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}

	u := &url.URL{
		Scheme: "postgresql",
		Host:   net.JoinHostPort(host, port),
		Path:   "/" + database,
	}

	password := firstNonEmpty(getenv, "PGPASSWORD", "POSTGRES_PASSWORD")
	if password != "" {
		u.User = url.UserPassword(user, password)
	} else {
		u.User = url.User(user)
	}

	query := u.Query()
	query.Set("sslmode", defaultSSLModeForHost(host))
	query.Set("connect_timeout", strconv.Itoa(connectTimeoutSeconds))
	u.RawQuery = query.Encode()

	return u.String(), true
}

func normalizeDatabaseURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("DATABASE_URL is empty")
	}

	u, err := url.Parse(raw)
	if err != nil || !isPostgresScheme(u.Scheme) {
		return raw, nil
	}

	query := u.Query()
	if query.Get("sslmode") == "" {
		query.Set("sslmode", defaultSSLModeForHost(u.Hostname()))
	}
	if query.Get("connect_timeout") == "" {
		query.Set("connect_timeout", strconv.Itoa(connectTimeoutSeconds))
	}
	u.RawQuery = query.Encode()

	return u.String(), nil
}

func defaultSSLModeForHost(host string) string {
	if isLocalHost(host) {
		return "disable"
	}
	return "require"
}

func isPostgresScheme(scheme string) bool {
	return scheme == "postgres" || scheme == "postgresql"
}

func isLocalHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	switch host {
	case "", "localhost", "127.0.0.1", "::1":
		return true
	}

	if ip := net.ParseIP(host); ip != nil {
		return ip.IsLoopback() || ip.IsPrivate()
	}

	// Single-label service names such as "postgres" are typical local/docker hosts.
	return !strings.Contains(host, ".")
}

func firstNonEmpty(getenv func(string) string, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func readIntEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}
