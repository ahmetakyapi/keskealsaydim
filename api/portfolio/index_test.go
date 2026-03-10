package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
)

func TestHandlerRejectsUnauthorizedPortfolioRequest(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/portfolio", bytes.NewBufferString(`{"symbol":"THYAO"}`))
	rec := httptest.NewRecorder()

	Handler(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
}

func TestHandlerRejectsNonPositivePortfolioValues(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("b", 32))

	token, err := auth.GenerateAccessToken(uuid.New(), "test@example.com")
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/portfolio", bytes.NewBufferString(`{
		"symbol":"thyao.is",
		"quantity":0,
		"buyPrice":10
	}`))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	Handler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d with body %s", rec.Code, rec.Body.String())
	}
}
