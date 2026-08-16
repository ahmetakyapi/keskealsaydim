package respond

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"keskealsaydim/pkg/cache"
)

// RateLimit is a fixed-window limiter backed by the shared Redis cache. It
// exists because the auth routes are otherwise open to unlimited credential
// guessing — serverless instances are too short-lived to hold state in memory.
type RateLimit struct {
	// Name namespaces the counter, e.g. "login".
	Name string
	// Max is how many attempts a single client may make per window.
	Max int64
	// Window is the length of the fixed window.
	Window time.Duration
}

// Allow reports whether the request may proceed, and writes a 429 response
// with a Turkish message when it may not.
//
// If no cache backend is configured the limiter fails open: a personal
// deployment without Redis should still be able to log in.
func (rl RateLimit) Allow(w http.ResponseWriter, r *http.Request, extraKey string) bool {
	if !cache.Available() {
		return true
	}

	key := fmt.Sprintf("rl:%s:%s", rl.Name, hashIdentity(ClientIP(r), extraKey))
	count, ok := cache.Incr(key, rl.Window)
	if !ok {
		return true
	}

	if count > rl.Max {
		retryAfter := int(rl.Window.Seconds())
		w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
		Error(w, http.StatusTooManyRequests,
			fmt.Sprintf("Çok fazla deneme yaptınız, %d saniye sonra tekrar deneyin", retryAfter))
		return false
	}

	return true
}

// ClientIP resolves the caller's address behind Vercel's proxy.
func ClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// The left-most entry is the original client.
		if first, _, found := strings.Cut(forwarded, ","); found {
			return strings.TrimSpace(first)
		}
		return strings.TrimSpace(forwarded)
	}
	if real := r.Header.Get("X-Real-IP"); real != "" {
		return strings.TrimSpace(real)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// hashIdentity keeps raw IPs and e-mail addresses out of cache keys and logs.
func hashIdentity(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:])[:32]
}
