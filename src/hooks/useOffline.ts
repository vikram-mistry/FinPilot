import { useEffect, useSyncExternalStore } from 'react';

/**
 * Subscribe to the browser's online/offline events.
 * Uses `useSyncExternalStore` for tear-free reads that are
 * compatible with React 18 concurrent features.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // During SSR (unlikely for this PWA) assume online
  return true;
}

/**
 * React hook that returns the current network connectivity status.
 *
 * @returns `{ isOnline: boolean }`
 *
 * @example
 * ```tsx
 * const { isOnline } = useOffline();
 * if (!isOnline) return <OfflineBanner />;
 * ```
 */
export function useOffline(): { isOnline: boolean } {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isOnline };
}
