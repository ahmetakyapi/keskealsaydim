package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	var (
		name       = flag.String("name", "Ahmet Test", "display name")
		email      = flag.String("email", "ahmet@ahmet.com", "email address")
		password   = flag.String("password", "ahmet1907", "plain password")
		experience = flag.String("experience", "BEGINNER", "BEGINNER|INTERMEDIATE|ADVANCED|EXPERT")
	)
	flag.Parse()

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		fmt.Fprintln(os.Stderr, "DATABASE_URL tanımlı değil")
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "DB pool oluşturulamadı: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "DB erişilemiyor: %v\n", err)
		os.Exit(1)
	}

	emailNorm := strings.ToLower(strings.TrimSpace(*email))
	nameNorm := strings.TrimSpace(*name)
	if emailNorm == "" || nameNorm == "" || len(*password) < 6 {
		fmt.Fprintln(os.Stderr, "Geçersiz giriş: name/email boş olamaz, password en az 6 karakter olmalı")
		os.Exit(1)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), 12)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Şifre hash üretilemedi: %v\n", err)
		os.Exit(1)
	}

	userID := uuid.New()
	var resultID uuid.UUID
	err = pool.QueryRow(ctx, `
		INSERT INTO users (id, email, password_hash, name, experience_level, is_active)
		VALUES ($1, $2, $3, $4, $5::experience_level, true)
		ON CONFLICT (email)
		DO UPDATE SET
			password_hash = EXCLUDED.password_hash,
			name = EXCLUDED.name,
			experience_level = EXCLUDED.experience_level,
			is_active = true,
			updated_at = NOW()
		RETURNING id
	`, userID, emailNorm, string(hash), nameNorm, strings.ToUpper(strings.TrimSpace(*experience))).Scan(&resultID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Kullanıcı oluşturulamadı/güncellenemedi: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Test kullanıcı hazır: %s (%s) id=%s\n", nameNorm, emailNorm, resultID)
}
