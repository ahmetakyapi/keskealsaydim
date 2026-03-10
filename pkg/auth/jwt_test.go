package auth

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestGenerateAccessTokenRequiresStrongSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "short-secret")

	_, err := GenerateAccessToken(uuid.New(), "test@example.com")
	if err == nil {
		t.Fatal("expected config error for short JWT secret")
	}
	if !IsConfigError(err) {
		t.Fatalf("expected config error, got %v", err)
	}
}

func TestAccessAndRefreshTokenRoundTrip(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("a", 32))

	userID := uuid.New()

	accessToken, err := GenerateAccessToken(userID, "test@example.com")
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	claims, err := ValidateAccessToken(accessToken)
	if err != nil {
		t.Fatalf("ValidateAccessToken returned error: %v", err)
	}
	if claims.UserID != userID {
		t.Fatalf("expected user id %s, got %s", userID, claims.UserID)
	}
	if claims.Email != "test@example.com" {
		t.Fatalf("expected email test@example.com, got %s", claims.Email)
	}

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	fromReqClaims, err := FromRequest(req)
	if err != nil {
		t.Fatalf("FromRequest returned error: %v", err)
	}
	if fromReqClaims.UserID != userID {
		t.Fatalf("expected request user id %s, got %s", userID, fromReqClaims.UserID)
	}

	refreshToken, err := GenerateRefreshToken(userID)
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned error: %v", err)
	}

	refreshUserID, err := ValidateRefreshToken(refreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken returned error: %v", err)
	}
	if refreshUserID != userID {
		t.Fatalf("expected refresh user id %s, got %s", userID, refreshUserID)
	}
}

func TestGenerateRefreshTokenReturnsUniqueTokens(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("a", 32))

	userID := uuid.New()

	firstToken, err := GenerateRefreshToken(userID)
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned error: %v", err)
	}

	secondToken, err := GenerateRefreshToken(userID)
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned error: %v", err)
	}

	if firstToken == secondToken {
		t.Fatal("expected refresh tokens to be unique")
	}
}
