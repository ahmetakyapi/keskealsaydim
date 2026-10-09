import { useEffect } from 'react';
import { useMotionStore } from '@/stores/motionStore';

/** Mount inside a Suspense fallback so the top bar runs while a chunk loads. */
export function usePendingSignal() {
  const begin = useMotionStore((state) => state.beginPending);
  const end = useMotionStore((state) => state.endPending);

  useEffect(() => {
    begin();
    return end;
  }, [begin, end]);
}
