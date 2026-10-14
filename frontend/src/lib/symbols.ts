/**
 * Readable labels for the market overview's non-equity instruments.
 *
 * Yahoo's tickers for indices, FX and futures (`^IXIC`, `GC=F`, `BZ=F`) mean
 * nothing to most readers, and their own names are clipped English
 * ("Brent Crude Oil Last Day Financ"). Equities keep their ticker, minus the
 * `.IS` suffix the API uses for Borsa İstanbul.
 */

interface InstrumentLabel {
  label: string;
  description: string;
}

const INSTRUMENTS: Record<string, InstrumentLabel> = {
  'XU100.IS': { label: 'BIST 100', description: 'Borsa İstanbul 100 endeksi' },
  'XU030.IS': { label: 'BIST 30', description: 'Borsa İstanbul 30 endeksi' },
  '^GSPC': { label: 'S&P 500', description: "ABD'nin 500 büyük şirketi" },
  '^IXIC': { label: 'Nasdaq', description: 'Nasdaq bileşik endeksi' },
  'USDTRY=X': { label: 'USD/TRY', description: 'Dolar kuru' },
  'EURTRY=X': { label: 'EUR/TRY', description: 'Euro kuru' },
  'GBPTRY=X': { label: 'GBP/TRY', description: 'Sterlin kuru' },
  'GC=F': { label: 'Altın', description: 'Ons, vadeli, dolar' },
  'SI=F': { label: 'Gümüş', description: 'Ons, vadeli, dolar' },
  'BZ=F': { label: 'Brent Petrol', description: 'Varil, vadeli, dolar' },
};

function lookup(symbol: string): InstrumentLabel | undefined {
  const key = symbol.trim().toUpperCase();
  return INSTRUMENTS[key] ?? INSTRUMENTS[`${key}.IS`];
}

/** Short label for a symbol: "Altın" for GC=F, "THYAO" for THYAO.IS. */
export function displaySymbol(symbol: string): string {
  return lookup(symbol)?.label ?? symbol.trim().replace(/\.IS$/i, '');
}

/** Secondary line under the label; falls back to the quote's own name. */
export function describeSymbol(symbol: string, fallbackName?: string): string {
  return lookup(symbol)?.description ?? fallbackName ?? '';
}
