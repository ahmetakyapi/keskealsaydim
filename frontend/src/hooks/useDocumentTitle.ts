import { useEffect } from 'react';

const SUFFIX = 'Keşke Alsaydım';

/** Gives every route a distinct title; the SPA kept the landing title. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — Yatırım Karşılaştırma`;
  }, [title]);
}
