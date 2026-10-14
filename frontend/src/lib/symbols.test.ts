import { describe, expect, it } from 'vitest';
import { describeSymbol, displaySymbol } from './symbols';

describe('displaySymbol', () => {
  it('drops the Borsa İstanbul suffix from equities', () => {
    expect(displaySymbol('THYAO.IS')).toBe('THYAO');
    expect(displaySymbol('AAPL')).toBe('AAPL');
  });

  it('names futures, FX pairs and indices in Turkish', () => {
    expect(displaySymbol('GC=F')).toBe('Altın');
    expect(displaySymbol('USDTRY=X')).toBe('USD/TRY');
    expect(displaySymbol('^IXIC')).toBe('Nasdaq');
  });

  it('finds an index even without its suffix', () => {
    expect(displaySymbol('XU100')).toBe('BIST 100');
  });
});

describe('describeSymbol', () => {
  it('replaces Yahoo’s clipped English names for known instruments', () => {
    expect(describeSymbol('BZ=F', 'Brent Crude Oil Last Day Financ')).toBe('Varil, vadeli, dolar');
  });

  it('keeps the quote’s own name for everything else', () => {
    expect(describeSymbol('ASELS.IS', 'Aselsan')).toBe('Aselsan');
  });
});
