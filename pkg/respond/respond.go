package respond

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

const DefaultTimeout = 15 * time.Second

// Ctx returns a context.Background with DefaultTimeout.
func Ctx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), DefaultTimeout)
}

// LogError logs an error with a prefix for structured debugging.
func LogError(handler string, msg string, err error) {
	if err != nil {
		log.Printf("[ERROR] %s: %s — %v", handler, msg, err)
	}
}

// CORS sets permissive CORS headers and handles preflight OPTIONS requests.
// Returns true if the request was a preflight (caller should return immediately).
func CORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	allowed := allowedOrigin(origin)
	w.Header().Set("Access-Control-Allow-Origin", allowed)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Max-Age", "3600")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

func allowedOrigin(origin string) string {
	permitted := []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:5173",
	}
	if env := os.Getenv("FRONTEND_URL"); env != "" {
		permitted = append(permitted, env)
	}
	for _, p := range permitted {
		if origin == p {
			return origin
		}
	}
	return ""
}

// JSON writes v as JSON with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes a JSON error response.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// MethodNotAllowed returns 405.
func MethodNotAllowed(w http.ResponseWriter) {
	Error(w, http.StatusMethodNotAllowed, "method not allowed")
}
