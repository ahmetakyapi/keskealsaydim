package auth

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	AccessTokenTTL  = 24 * time.Hour
	RefreshTokenTTL = 7 * 24 * time.Hour
)

type Claims struct {
	UserID uuid.UUID `json:"userId"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

func secret() []byte { return []byte(os.Getenv("JWT_SECRET")) }

// GenerateAccessToken creates a signed access JWT.
func GenerateAccessToken(userID uuid.UUID, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret())
}

// GenerateRefreshToken creates a signed refresh JWT.
func GenerateRefreshToken(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"sub":  userID.String(),
		"type": "refresh",
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(RefreshTokenTTL).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret())
}

// ValidateAccessToken parses and validates an access token.
func ValidateAccessToken(tokenStr string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret(), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return nil, errors.New("invalid token claims")
	}
	return claims, nil
}

// ValidateRefreshToken parses a refresh token and returns the user ID.
func ValidateRefreshToken(tokenStr string) (uuid.UUID, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret(), nil
	})
	if err != nil {
		return uuid.Nil, err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok || !tok.Valid {
		return uuid.Nil, errors.New("invalid refresh token")
	}
	if claims["type"] != "refresh" {
		return uuid.Nil, errors.New("not a refresh token")
	}
	sub, _ := claims["sub"].(string)
	return uuid.Parse(sub)
}

// FromRequest extracts and validates the Bearer token from Authorization header.
func FromRequest(r *http.Request) (*Claims, error) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return nil, errors.New("missing or malformed Authorization header")
	}
	return ValidateAccessToken(strings.TrimPrefix(header, "Bearer "))
}
