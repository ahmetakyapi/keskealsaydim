// Package cache provides a thin wrapper around Upstash Redis REST API.
// No persistent TCP connection needed — perfect for serverless.
package cache

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var client = &http.Client{Timeout: 3 * time.Second}

func baseURL() string { return strings.TrimRight(os.Getenv("UPSTASH_REDIS_REST_URL"), "/") }
func token() string   { return os.Getenv("UPSTASH_REDIS_REST_TOKEN") }

func do(method, path string, body io.Reader) ([]byte, error) {
	req, err := http.NewRequest(method, baseURL()+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token())
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// Set stores a JSON-serialised value with a TTL.
func Set(key string, v any, ttl time.Duration) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	secs := int(ttl.Seconds())
	path := fmt.Sprintf("/set/%s/%s?EX=%d", url.PathEscape(key), url.PathEscape(string(data)), secs)
	_, err = do(http.MethodGet, path, nil)
	return err
}

// Get retrieves a value and JSON-unmarshals it into dest.
// Returns (false, nil) when the key doesn't exist.
func Get(key string, dest any) (bool, error) {
	b, err := do(http.MethodGet, "/get/"+url.PathEscape(key), nil)
	if err != nil {
		return false, err
	}
	var wrapper struct {
		Result *string `json:"result"`
	}
	if err := json.Unmarshal(b, &wrapper); err != nil {
		return false, err
	}
	if wrapper.Result == nil {
		return false, nil
	}
	return true, json.Unmarshal([]byte(*wrapper.Result), dest)
}
