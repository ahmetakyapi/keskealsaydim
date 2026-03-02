package db

import (
	"context"
	"os"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool   *pgxpool.Pool
	poolMu sync.Mutex
)

// Get returns the shared connection pool, creating it on first call.
// Neon: use the pooler (pgbouncer) connection string for serverless.
func Get() (*pgxpool.Pool, error) {
	poolMu.Lock()
	defer poolMu.Unlock()
	if pool != nil {
		return pool, nil
	}
	cfg, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		return nil, err
	}
	// Keep low for serverless cold-start efficiency
	cfg.MaxConns = 3
	// Disable prepared statements for pgbouncer compatibility
	cfg.ConnConfig.DefaultQueryExecMode = 3 // pgx.QueryExecModeSimpleProtocol
	p, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, err
	}
	pool = p
	return pool, nil
}
