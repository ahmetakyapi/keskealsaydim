package db

import (
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestQueryExecModeIsSimpleProtocol pins the pooler-safe query mode.
//
// This exists because the setting was once written as the literal `3` with a
// comment claiming it was QueryExecModeSimpleProtocol. pgx's iota block opens
// with a blank identifier, so 3 is actually QueryExecModeDescribeExec, which
// carries an unnamed prepared statement across two round trips — unsafe behind
// pgbouncer transaction pooling, and it corrupted the wire protocol under
// concurrent requests.
func TestQueryExecModeIsSimpleProtocol(t *testing.T) {
	if got := int32(pgx.QueryExecModeDescribeExec); got != 3 {
		t.Fatalf("expected DescribeExec to be 3 (the value that used to be hard-coded), got %d", got)
	}
	if int32(pgx.QueryExecModeSimpleProtocol) == int32(pgx.QueryExecModeDescribeExec) {
		t.Fatal("the two modes must differ; the whole bug was confusing them")
	}
}

// TestOpenPoolUsesSimpleProtocol verifies the pool config itself, not just the
// constant, so a future edit to db.go cannot silently reintroduce the bug.
func TestOpenPoolUsesSimpleProtocol(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db?sslmode=disable")

	url, err := databaseURLFromEnv(func(key string) string {
		if key == "DATABASE_URL" {
			return "postgresql://user:pass@localhost:5432/db?sslmode=disable"
		}
		return ""
	})
	if err != nil {
		t.Fatalf("databaseURLFromEnv: %v", err)
	}

	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatalf("ParseConfig: %v", err)
	}
	applyPoolTuning(cfg)

	if cfg.ConnConfig.DefaultQueryExecMode != pgx.QueryExecModeSimpleProtocol {
		t.Fatalf("expected the simple protocol behind pgbouncer, got %v",
			cfg.ConnConfig.DefaultQueryExecMode)
	}
}
