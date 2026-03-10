package finance

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestGetMarketCapsMapsBatchQuoteResponse(t *testing.T) {
	originalClient := httpClient
	t.Cleanup(func() {
		httpClient = originalClient
	})

	httpClient = &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.URL.Host != "query1.finance.yahoo.com" {
				t.Fatalf("unexpected host %s", req.URL.Host)
			}
			if req.URL.Path != "/v7/finance/quote" {
				t.Fatalf("unexpected path %s", req.URL.Path)
			}

			rawSymbols := req.URL.Query().Get("symbols")
			if rawSymbols != "THYAO.IS,AAPL" {
				t.Fatalf("unexpected symbols query %q", rawSymbols)
			}

			body := `{"quoteResponse":{"result":[{"symbol":"THYAO.IS","marketCap":123456789},{"symbol":"AAPL","marketCap":987654321}],"error":null}}`
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(body)),
				Header:     make(http.Header),
			}, nil
		}),
	}

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
