package finance

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
	}
}

// stubClient installs a transport and clears any crumb cached by a prior test.
func stubClient(t *testing.T, fn roundTripFunc) {
	t.Helper()
	original := httpClient
	t.Cleanup(func() {
		httpClient = original
		invalidateCrumb()
	})
	invalidateCrumb()
	httpClient = &http.Client{Transport: fn}
}

func TestGetMarketCapsMapsBatchQuoteResponse(t *testing.T) {
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		switch {
		case req.URL.Host == "fc.yahoo.com":
			return jsonResponse(http.StatusOK, ""), nil
		case req.URL.Path == "/v1/test/getcrumb":
			return jsonResponse(http.StatusOK, "test-crumb"), nil
		case req.URL.Path == "/v7/finance/quote":
			if got := req.URL.Query().Get("crumb"); got != "test-crumb" {
				t.Fatalf("expected crumb to be forwarded, got %q", got)
			}
			if got := req.URL.Query().Get("symbols"); got != "THYAO.IS,AAPL" {
				t.Fatalf("unexpected symbols query %q", got)
			}
			return jsonResponse(http.StatusOK,
				`{"quoteResponse":{"result":[{"symbol":"THYAO.IS","marketCap":123456789},{"symbol":"AAPL","marketCap":987654321}],"error":null}}`), nil
		default:
			t.Fatalf("unexpected request %s", req.URL.String())
			return nil, nil
		}
	})

	marketCaps, err := GetMarketCaps([]string{"THYAO.IS", "AAPL"})
	if err != nil {
		t.Fatalf("GetMarketCaps returned error: %v", err)
	}

	if got := marketCaps["THYAO.IS"]; got != 123456789 {
		t.Fatalf("expected THYAO.IS market cap 123456789, got %d", got)
	}
	if got := marketCaps["AAPL"]; got != 987654321 {
		t.Fatalf("expected AAPL market cap 987654321, got %d", got)
	}
}

func TestFetchRetriesRetryableYahooErrors(t *testing.T) {
	attempts := 0
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		attempts++
		if attempts < 3 {
			return jsonResponse(http.StatusServiceUnavailable, "temporary outage"), nil
		}
		return jsonResponse(http.StatusOK, `{"ok":true}`), nil
	})

	body, err := fetch(context.Background(), "https://query1.finance.yahoo.com/v8/finance/chart/AAPL")
	if err != nil {
		t.Fatalf("fetch returned error: %v", err)
	}
	if string(body) != `{"ok":true}` {
		t.Fatalf("unexpected body %s", string(body))
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestGetQuoteRejectsEmptyMeta(t *testing.T) {
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK,
			`{"chart":{"result":[{"meta":{"currency":"TRY"},"timestamp":[],"indicators":{"quote":[{"close":[]}]}}],"error":null}}`), nil
	})

	if _, err := GetQuote("THYAO"); err == nil {
		t.Fatal("expected an error when Yahoo returns no usable price, got nil")
	}
}

func TestGetQuoteCarriesCurrency(t *testing.T) {
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK,
			`{"chart":{"result":[{"meta":{"currency":"usd","regularMarketPrice":200,"chartPreviousClose":190,"shortName":"Apple"},"timestamp":[1],"indicators":{"quote":[{"close":[200]}]}}],"error":null}}`), nil
	})

	q, err := GetQuote("AAPL")
	if err != nil {
		t.Fatalf("GetQuote returned error: %v", err)
	}
	if q.Currency != "USD" {
		t.Fatalf("expected currency USD, got %q", q.Currency)
	}
	if q.Change != 10 {
		t.Fatalf("expected change 10, got %v", q.Change)
	}
}

func TestSearchIsTurkishCaseInsensitive(t *testing.T) {
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK, `{"quotes":[]}`), nil
	})

	for _, query := range []string{"iş bankası", "IS BANKASI", "İŞ", "is"} {
		results, err := Search(query)
		if err != nil {
			t.Fatalf("Search(%q) returned error: %v", query, err)
		}
		found := false
		for _, r := range results {
			if r.Symbol == "ISCTR" {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("Search(%q) did not find ISCTR; got %+v", query, results)
		}
	}
}

func TestSearchReturnsEmptySliceNotNil(t *testing.T) {
	stubClient(t, func(req *http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK, `{"quotes":[]}`), nil
	})

	results, err := Search("zzzzzznomatch")
	if err != nil {
		t.Fatalf("Search returned error: %v", err)
	}
	if results == nil {
		t.Fatal("expected a non-nil slice so the API serialises [] instead of null")
	}
	if len(results) != 0 {
		t.Fatalf("expected no results, got %d", len(results))
	}
}

func TestRound4Rounds(t *testing.T) {
	// The previous implementation truncated, which biased negative changes.
	if got := round4(-1.00005); got != -1.0001 {
		t.Fatalf("expected -1.0001, got %v", got)
	}
	if got := round4(2.00005); got != 2.0001 {
		t.Fatalf("expected 2.0001, got %v", got)
	}
}
