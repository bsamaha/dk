import { useEffect, useCallback } from 'react';
import {
  trackPageView as safeTrackPageView,
  trackEvent as safeTrackEvent,
  logAnalyticsEvent,
} from '../utils/analytics';

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

  // Track error
  const trackError = useCallback(
    (errorType: string, errorMessage: string) => {
      trackEvent({
        category: 'Error',
        action: 'error',
        label: `${errorType}: ${errorMessage}`,
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
  };
};

/**
 * Hook to automatically track page views on route changes
 * Use this in your main App component or router
 */
export const usePageTracking = () => {
  const { trackPageView } = useGoogleAnalytics();

  useEffect(() => {
    // Track initial page view
    trackPageView();

    // Track page views on navigation
    const handleRouteChange = () => {
      trackPageView();
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Listen for pushState/replaceState events (client-side routing)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      // Small delay to ensure DOM is updated
      setTimeout(handleRouteChange, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      // Small delay to ensure DOM is updated
      setTimeout(handleRouteChange, 0);
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [trackPageView]);
};
