package db

import (
	"net/url"
	"testing"
)

func TestNormalizeDatabaseURLAddsSSLAndTimeoutForRemoteHosts(t *testing.T) {
	databaseURL, err := normalizeDatabaseURL("postgresql://user:pass@ep-foo.neon.tech/mydb")
	if err != nil {
		t.Fatalf("normalizeDatabaseURL returned error: %v", err)
	}

	parsed, err := url.Parse(databaseURL)
	if err != nil {
		t.Fatalf("failed to parse normalized url: %v", err)
	}

	if got := parsed.Query().Get("sslmode"); got != "require" {
		t.Fatalf("expected sslmode=require, got %q", got)
	}
	if got := parsed.Query().Get("connect_timeout"); got != "8" {
		t.Fatalf("expected connect_timeout=8, got %q", got)
	}
}

func TestNormalizeDatabaseURLDisablesSSLForLocalhostWhenUnset(t *testing.T) {
	databaseURL, err := normalizeDatabaseURL("postgresql://postgres@127.0.0.1:5432/keskealsaydim")
	if err != nil {
		t.Fatalf("normalizeDatabaseURL returned error: %v", err)
	}

	parsed, err := url.Parse(databaseURL)
	if err != nil {
		t.Fatalf("failed to parse normalized url: %v", err)
	}

	if got := parsed.Query().Get("sslmode"); got != "disable" {
		t.Fatalf("expected sslmode=disable, got %q", got)
	}
}

func TestDatabaseURLFromEnvFallsBackToProviderAndPartVariables(t *testing.T) {
	env := map[string]string{
		"POSTGRES_URL":      "postgresql://provider:secret@db.example.com/app",
		"PGHOST":            "ignored-host",
		"PGDATABASE":        "ignored-db",
		"PGUSER":            "ignored-user",
		"POSTGRES_PASSWORD": "ignored-pass",
	}

	getenv := func(key string) string {
		return env[key]
	}

	databaseURL, err := databaseURLFromEnv(getenv)
	if err != nil {
		t.Fatalf("databaseURLFromEnv returned error: %v", err)
	}

	if parsed, err := url.Parse(databaseURL); err != nil {
		t.Fatalf("failed to parse url: %v", err)
	} else if parsed.Hostname() != "db.example.com" {
		t.Fatalf("expected provider host db.example.com, got %q", parsed.Hostname())
	}

	delete(env, "POSTGRES_URL")
	env["PGHOST"] = "localhost"
	env["PGDATABASE"] = "keskealsaydim"
	env["PGUSER"] = "postgres"
	env["PGPASSWORD"] = "secret"

	databaseURL, err = databaseURLFromEnv(getenv)
	if err != nil {
		t.Fatalf("databaseURLFromEnv returned error from PG vars: %v", err)
	}

	parsed, err := url.Parse(databaseURL)
	if err != nil {
		t.Fatalf("failed to parse PG var url: %v", err)
	}

	if parsed.Hostname() != "localhost" {
		t.Fatalf("expected localhost host, got %q", parsed.Hostname())
	}
	if parsed.Query().Get("sslmode") != "disable" {
		t.Fatalf("expected localhost sslmode=disable, got %q", parsed.Query().Get("sslmode"))
	}
}
