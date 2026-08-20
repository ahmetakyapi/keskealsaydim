import { describe, expect, it } from 'vitest';
import {
  normalizeMarketOverview,
  normalizePortfolioSummary,
  normalizeWatchlist,
} from './api-normalizers';

/**
 * The normalisers exist so a dropped or malformed field degrades to a safe
 * default instead of surfacing as NaN inside a chart. These tests feed them
 * exactly the shapes that would break the UI.
 */

describe('normalizePortfolioSummary', () => {
  it('returns an empty, usable summary for junk input', () => {
    for (const input of [null, undefined, 'nope', 42, []]) {
      const result = normalizePortfolioSummary(input);
      expect(result.holdings).toEqual([]);
      expect(result.closedPositions).toEqual([]);
      expect(result.totalValue).toBe(0);
      expect(result.baseCurrency).toBe('TRY');
    }
  });

  it('coerces numeric strings and drops non-finite values', () => {
    const result = normalizePortfolioSummary({
      holdings: [{ id: 'a', symbol: 'THYAO', quantity: '25', currentValue: 'abc' }],
      totalValue: '1000.5',
    });
    expect(result.holdings[0].quantity).toBe(25);
    expect(result.holdings[0].currentValue).toBe(0);
    expect(result.totalValue).toBe(1000.5);
  });

  it('falls back to the symbol when the name is missing', () => {
    const result = normalizePortfolioSummary({ holdings: [{ symbol: 'ASELS' }] });
    expect(result.holdings[0].symbolName).toBe('ASELS');
  });

  it('defaults an unknown status to OPEN rather than passing it through', () => {
    const result = normalizePortfolioSummary({ holdings: [{ status: 'WEIRD' }] });
    expect(result.holdings[0].status).toBe('OPEN');
  });

  it('keeps a declared foreign currency', () => {
    const result = normalizePortfolioSummary({ holdings: [{ currency: 'usd' }] });
    expect(result.holdings[0].currency).toBe('USD');
  });

  it('marks a holding stale only when the API says so', () => {
    const summary = normalizePortfolioSummary({
      holdings: [{ symbol: 'A', stale: true }, { symbol: 'B' }],
    });
    expect(summary.holdings[0].stale).toBe(true);
    expect(summary.holdings[1].stale).toBe(false);
  });
});

describe('normalizeMarketOverview', () => {
  it('survives a missing quotes array', () => {
    expect(normalizeMarketOverview({}).quotes).toEqual([]);
  });

  it('defaults an unrecognised category instead of leaking it into a filter', () => {
    const result = normalizeMarketOverview({ quotes: [{ symbol: 'X', category: 'MOON' }] });
    expect(result.quotes[0].category).toBe('BIST');
  });

  it('only accepts the market states the UI can render', () => {
    expect(normalizeMarketOverview({ marketState: 'OPEN' }).marketState).toBe('OPEN');
    expect(normalizeMarketOverview({ marketState: 'nonsense' }).marketState).toBe('UNKNOWN');
    expect(normalizeMarketOverview({}).marketState).toBe('UNKNOWN');
  });
});

describe('normalizeWatchlist', () => {
  it('returns an array even when handed an object', () => {
    expect(normalizeWatchlist({ nope: true })).toEqual([]);
  });

  it('defaults priceAvailable to false so a missing quote is not rendered as ₺0', () => {
    const [item] = normalizeWatchlist([{ symbol: 'THYAO' }]);
    expect(item.priceAvailable).toBe(false);
    expect(item.price).toBe(0);
  });

  it('preserves an explicit priceAvailable', () => {
    const [item] = normalizeWatchlist([{ symbol: 'THYAO', price: 305.25, priceAvailable: true }]);
    expect(item.priceAvailable).toBe(true);
    expect(item.price).toBe(305.25);
  });
});
