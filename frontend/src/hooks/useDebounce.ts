import { useCallback, useRef, useEffect } from 'react';

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
  const timeoutRef = useRef<number | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook specifically for debouncing analytics tracking
 * @param trackingFunction - Analytics tracking function
 * @param delay - Delay in milliseconds (default: 2000ms)
 * @returns Debounced tracking function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAnalyticsDebounce = <T extends (...args: any[]) => void>(
  trackingFunction: T,
  delay: number = 2000
): T => {
  const timeoutRef = useRef<number | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = window.setTimeout(() => {
        trackingFunction(...args);
      }, delay);
    },
    [trackingFunction, delay]
  ) as T;

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return debouncedCallback;
};
