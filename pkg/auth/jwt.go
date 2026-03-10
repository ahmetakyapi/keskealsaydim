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

var errInvalidJWTSecret = errors.New("JWT_SECRET must be set and at least 32 characters long")

type Claims struct {
	UserID uuid.UUID `json:"userId"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

func secret() ([]byte, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if len(secret) < 32 {
		return nil, errInvalidJWTSecret
	}
	return []byte(secret), nil
}

func IsConfigError(err error) bool {
	return errors.Is(err, errInvalidJWTSecret)
}

// GenerateAccessToken creates a signed access JWT.
func GenerateAccessToken(userID uuid.UUID, email string) (string, error) {
	key, err := secret()
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

// GenerateRefreshToken creates a signed refresh JWT.
func GenerateRefreshToken(userID uuid.UUID) (string, error) {
	key, err := secret()
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := jwt.MapClaims{
		"sub":  userID.String(),
		"type": "refresh",
		"iat":  now.Unix(),
		"exp":  now.Add(RefreshTokenTTL).Unix(),
		"jti":  uuid.NewString(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(key)
}

// ValidateAccessToken parses and validates an access token.
func ValidateAccessToken(tokenStr string) (*Claims, error) {
	key, err := secret()
	if err != nil {
		return nil, err
	}

	tok, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return key, nil
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
	key, err := secret()
	if err != nil {
		return uuid.Nil, err
	}

	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return key, nil
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
