import { useEffect, useCallback } from 'react';
import {
  trackPageView as safeTrackPageView,
  trackEvent as safeTrackEvent,
  logAnalyticsEvent,
  debugGAStatus,
  testGAEvent,
} from '../utils/analytics';
import {
  sanitizeErrorMessage,
  sanitizeErrorType,
} from '../utils/errorSanitization';

// Type definitions for Google Analytics
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'consent',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

interface EventOptions {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

interface PageViewOptions {
  page_title?: string;
  page_location?: string;
  page_path?: string;
}

/**
 * Custom hook for Google Analytics tracking
 * Provides functions to track page views and custom events
 */
export const useGoogleAnalytics = () => {
  // Track page view
  const trackPageView = useCallback((options?: PageViewOptions) => {
    safeTrackPageView(options);
    logAnalyticsEvent('page_view', options);
  }, []);

  // Track custom event
  const trackEvent = useCallback((options: EventOptions) => {
    safeTrackEvent(options);
    logAnalyticsEvent('custom_event', options);
  }, []);

  // Track player search
  const trackPlayerSearch = useCallback(
    (searchTerm: string, resultsCount: number) => {
      trackEvent({
        category: 'Player Search',
        action: 'search',
        label: searchTerm,
        value: resultsCount,
      });
    },
    [trackEvent]
  );

  // Track player details view
  const trackPlayerDetails = useCallback(
    (playerName: string, position: string, team: string) => {
      trackEvent({
        category: 'Player Details',
        action: 'view',
        label: `${playerName} (${position}, ${team})`,
      });
    },
    [trackEvent]
  );

  // Track analytics view
  const trackAnalyticsView = useCallback(
    (analyticsType: string) => {
      trackEvent({
        category: 'Analytics',
        action: 'view',
        label: analyticsType,
      });
    },
    [trackEvent]
  );

  // Track combination search
  const trackCombinationSearch = useCallback(
    (playerCount: number, roundCount: number) => {
      trackEvent({
        category: 'Combinations',
        action: 'search',
        label: `${playerCount} players, ${roundCount} rounds`,
        value: playerCount,
      });
    },
    [trackEvent]
  );

  // Track position filter
  const trackPositionFilter = useCallback(
    (position: string) => {
      trackEvent({
        category: 'Filter',
        action: 'position_filter',
        label: position,
      });
    },
    [trackEvent]
  );

  // Track sort action
  const trackSort = useCallback(
    (column: string, order: 'asc' | 'desc') => {
      trackEvent({
        category: 'Table',
        action: 'sort',
        label: `${column}_${order}`,
      });
    },
    [trackEvent]
  );

  // Track export action
  const trackExport = useCallback(
    (exportType: string, dataType: string) => {
      trackEvent({
        category: 'Export',
        action: 'export',
        label: `${exportType}_${dataType}`,
      });
    },
    [trackEvent]
  );

  // Track error with sanitization
  const trackError = useCallback(
    (errorType: string, errorMessage: string) => {
      const sanitizedType = sanitizeErrorType(errorType);
      const sanitizedMessage = sanitizeErrorMessage(errorMessage);

      trackEvent({
        category: 'Error',
        action: 'error',
        label: `${sanitizedType}: ${sanitizedMessage}`,
      });
    },
    [trackEvent]
  );

  // Track performance
  const trackPerformance = useCallback(
    (metric: string, value: number) => {
      trackEvent({
        category: 'Performance',
        action: 'metric',
        label: metric,
        value: Math.round(value),
      });
    },
    [trackEvent]
  );

  return {
    trackPageView,
    trackEvent,
    trackPlayerSearch,
    trackPlayerDetails,
    trackAnalyticsView,
    trackCombinationSearch,
    trackPositionFilter,
    trackSort,
    trackExport,
    trackError,
    trackPerformance,
    // Debug helpers
    debugGAStatus,
    testGAEvent,
  };
};

/**
 * Hook to automatically track page views on view changes
 * Use this in your main App component
 * Waits for GA to be available to avoid dropping initial page view
 */
export const usePageTracking = (currentView?: string) => {
  const { trackPageView } = useGoogleAnalytics();

  useEffect(() => {
    // Wait for GA to be available before tracking, with fallback timeout
    const waitForGA = () => {
      let attempts = 0;
      const maxAttempts = 50; // Wait up to 5 seconds (50 * 100ms)
      let timeoutId: NodeJS.Timeout | null = null;

      const checkGA = () => {
        attempts++;

        // Check if GA is available or we've exceeded max attempts
        if (
          typeof window !== 'undefined' &&
          typeof window.gtag === 'function'
        ) {
          // GA is ready, track the page view
          trackPageView({
            page_title: currentView
              ? `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} - TheSignalCallers`
              : 'TheSignalCallers',
            page_path: currentView ? `/${currentView}` : '/',
          });
        } else if (attempts < maxAttempts && import.meta.env.PROD) {
          // GA not ready yet, wait and try again
          timeoutId = setTimeout(checkGA, 100);
        } else {
          // Timeout reached, track anyway (analytics utils handle missing gtag gracefully)
          if (import.meta.env.PROD) {
            console.warn(
              '[GA] Timeout waiting for gtag to be available, tracking anyway'
            );
          }
          trackPageView({
            page_title: currentView
              ? `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} - TheSignalCallers`
              : 'TheSignalCallers',
            page_path: currentView ? `/${currentView}` : '/',
          });
        }
      };

      checkGA();

      // Cleanup function to clear timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    };

    const cleanup = waitForGA();
    return cleanup;
  }, [currentView, trackPageView]);
};
