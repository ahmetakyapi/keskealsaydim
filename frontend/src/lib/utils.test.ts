import { describe, expect, it } from 'vitest';
import { foldTurkish, initialsOf, matchesQuery, normalizeSymbolInput, truncate } from './utils';

/**
 * Turkish casing is the recurring trap here: `toUpperCase()` turns "i" into
 * "I" rather than "İ", which is why searching "iş bankası" used to return
 * nothing at all.
 */

describe('foldTurkish', () => {
  it('folds both dotted and dotless I to the same letter', () => {
    expect(foldTurkish('İ')).toBe(foldTurkish('ı'));
    expect(foldTurkish('I')).toBe(foldTurkish('i'));
  });

  it('strips the remaining Turkish diacritics', () => {
    expect(foldTurkish('ŞİŞE')).toBe('sise');
    expect(foldTurkish('Ereğli')).toBe('eregli');
    expect(foldTurkish('Tüpraş')).toBe('tupras');
    expect(foldTurkish('Koç')).toBe('koc');
  });
});

describe('matchesQuery', () => {
  it('matches regardless of Turkish casing or accents', () => {
    expect(matchesQuery('İş Bankası', 'is bankasi')).toBe(true);
    expect(matchesQuery('İş Bankası', 'IŞ')).toBe(true);
    expect(matchesQuery('Şişe Cam', 'sise')).toBe(true);
    expect(matchesQuery('Türk Hava Yolları', 'hava')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesQuery('Aselsan', 'garanti')).toBe(false);
  });

  it('treats an empty query as matching everything', () => {
    expect(matchesQuery('Aselsan', '')).toBe(true);
  });
});

describe('normalizeSymbolInput', () => {
  it('upper-cases with the Turkish-safe rule', () => {
    // "isctr" must become ISCTR, never İSCTR.
    expect(normalizeSymbolInput('isctr')).toBe('ISCTR');
    expect(normalizeSymbolInput('ısctr')).toBe('ISCTR');
  });

  it('keeps the punctuation real tickers use', () => {
    expect(normalizeSymbolInput('brk-b')).toBe('BRK-B');
    expect(normalizeSymbolInput('usdtry=x')).toBe('USDTRY=X');
    expect(normalizeSymbolInput('thyao.is')).toBe('THYAO.IS');
    expect(normalizeSymbolInput('^gspc')).toBe('^GSPC');
  });

  it('drops characters a ticker cannot contain', () => {
    expect(normalizeSymbolInput('thy ao!')).toBe('THYAO');
  });
});

describe('initialsOf', () => {
  it('uses Turkish casing for the initial', () => {
    expect(initialsOf('irem yılmaz')).toBe('İY');
  });

  it('takes at most two initials', () => {
    expect(initialsOf('Ahmet Mehmet Akyapı')).toBe('AM');
  });

  it('degrades for a missing name', () => {
    expect(initialsOf(undefined)).toBe('?');
    expect(initialsOf('')).toBe('?');
  });
});

describe('truncate', () => {
  it('leaves short text alone and ellipsises long text', () => {
    expect(truncate('kısa', 10)).toBe('kısa');
    expect(truncate('çok uzun bir metin', 8)).toBe('çok uzun…');
  });
});
