package finance

import (
	"reflect"
	"testing"
)

func TestNormalizeStoredSymbol(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		output string
	}{
		{name: "known bist bare", input: "thyao", output: "THYAO"},
		{name: "known bist yahoo format", input: "  thyao.is ", output: "THYAO"},
		{name: "us ticker stays same", input: "aapl", output: "AAPL"},
		{name: "unknown yahoo suffix stays same", input: "HEKTS.IS", output: "HEKTS.IS"},
		{name: "empty", input: "   ", output: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeStoredSymbol(tt.input); got != tt.output {
				t.Fatalf("expected %q, got %q", tt.output, got)
			}
		})
	}
}

func TestSymbolVariants(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		output []string
	}{
		{name: "known bist", input: "THYAO.IS", output: []string{"THYAO", "THYAO.IS"}},
		{name: "us ticker", input: "AAPL", output: []string{"AAPL"}},
		{name: "empty", input: " ", output: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SymbolVariants(tt.input); !reflect.DeepEqual(got, tt.output) {
				t.Fatalf("expected %v, got %v", tt.output, got)
			}
		})
	}
}
