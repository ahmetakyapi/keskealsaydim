import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useStockSearch } from '@/hooks/useQueries';
import { cn, normalizeSymbolInput } from '@/lib/utils';
import type { StockSearchResult } from '@/types';

interface SymbolSearchProps {
  value?: string;
  onSelect: (result: StockSearchResult) => void;
  onClear?: () => void;
  placeholder?: string;
  label: string;
  /** Hide the visible label but keep it for screen readers. */
  hideLabel?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  id?: string;
  error?: string;
}

/**
 * Accessible combobox over the symbol search API.
 *
 * Every screen previously rolled its own version of this, and each one had the
 * same two defects: results were only selectable with a real mouse press
 * (`onMouseDown`, so Enter did nothing), and a symbol the user typed but never
 * clicked was silently discarded. Here the input is a real `combobox`, arrow
 * keys move the active option, Enter commits it, Escape closes, and a typed
 * symbol that exactly matches a result is committed on blur.
 */
export function SymbolSearch({
  value = '',
  onSelect,
  onClear,
  placeholder = 'Hisse adı veya sembol',
  label,
  hideLabel = false,
  disabled = false,
  autoFocus = false,
  className,
  id,
  error,
}: SymbolSearchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(value);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Keep in step when the parent swaps or resets the selection.
  useEffect(() => {
    setQuery(value);
    setDebouncedQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isFetching, isError } = useStockSearch(debouncedQuery);
  const results = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, results.length);
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const commit = useCallback(
    (result: StockSearchResult) => {
      setQuery(result.symbol);
      setDebouncedQuery(result.symbol);
      setOpen(false);
      setActiveIndex(-1);
      onSelect(result);
    },
    [onSelect]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      setActiveIndex((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        commit(results[activeIndex]);
        return;
      }
      // Nothing highlighted: accept an exactly-typed symbol so the user is not
      // forced to pick from the list to proceed.
      const typed = normalizeSymbolInput(query);
      const exact = results.find((item) => normalizeSymbolInput(item.symbol) === typed);
      if (exact) {
        event.preventDefault();
        commit(exact);
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    const typed = normalizeSymbolInput(query);
    if (!typed || typed === normalizeSymbolInput(value)) return;
    const exact = results.find((item) => normalizeSymbolInput(item.symbol) === typed);
    if (exact) {
      commit(exact);
    }
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
    setActiveIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const showPanel = open && debouncedQuery.trim().length >= 2;
  const statusId = `${inputId}-status`;

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      <label
        htmlFor={inputId}
        className={cn(
          'mb-1.5 block text-sm font-medium text-foreground',
          hideLabel && 'sr-only'
        )}
      >
        {label}
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
          }
          aria-describedby={statusId}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            'h-10 w-full rounded-lg border border-input bg-background pl-10 pr-9 text-sm',
            'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus-visible:ring-danger'
          )}
        />

        {isFetching && (
          <Loader2
            className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}

        {query.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={`${label} alanını temizle`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {showPanel && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
            {isFetching && results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Aranıyor…</p>
            ) : isError ? (
              <p className="px-3 py-3 text-sm text-danger">
                Arama şu anda yapılamıyor, birazdan tekrar deneyin.
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                “{debouncedQuery}” için sonuç bulunamadı.
              </p>
            ) : (
              <ul id={listboxId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
                {results.map((result, index) => (
                  <li
                    key={`${result.symbol}-${result.exchange}`}
                    id={`${inputId}-option-${index}`}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    role="option"
                    aria-selected={index === activeIndex}
                    // Keeps focus in the input so blur does not close the list
                    // before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors',
                      index === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{result.symbol.replace(/\.IS$/, '')}</span>
                      <span className="block truncate text-xs text-muted-foreground">{result.name}</span>
                    </span>
                    <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {result.exchange || result.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Announced to screen readers as the result count changes. */}
      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {showPanel && !isFetching ? `${results.length} sonuç bulundu` : ''}
      </p>

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
