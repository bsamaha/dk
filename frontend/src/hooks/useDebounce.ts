import { useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing function calls
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced version of the callback
 */
export const useDebounce = <T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Return both the debounced function and cleanup
  (debouncedCallback as T & { cleanup: () => void }).cleanup = cleanup;

  return debouncedCallback;
};

/**
 * Hook specifically for debouncing analytics tracking
 * @param trackingFunction - Analytics tracking function
 * @param delay - Delay in milliseconds (default: 2000ms)
 * @returns Debounced tracking function
 */
export const useAnalyticsDebounce = <
  T extends (searchTerm: string, resultsCount: number) => void,
>(
  trackingFunction: T,
  delay: number = 2000
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (searchTerm: string, resultsCount: number) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        trackingFunction(searchTerm, resultsCount);
      }, delay);
    },
    [trackingFunction, delay]
  ) as T;

  return debouncedCallback;
};
