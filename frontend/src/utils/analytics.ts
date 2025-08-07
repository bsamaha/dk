/**
 * Google Analytics configuration and utilities
 */

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Google Analytics Tracking ID (can be set dynamically)
export const getGATrackingId = (): string | null => {
  // Guard against SSR and non-browser environments
  if (typeof window === 'undefined') {
    return null;
  }

  // Try to get from window (set by HTML script) or environment
  const trackingId = (window as unknown as Record<string, unknown>)
    ?._gaTrackingId;
  const envTrackingId = import.meta.env.VITE_GA_TRACKING_ID;

  // Return the first available tracking ID
  if (typeof trackingId === 'string' && trackingId) {
    return trackingId;
  }
  if (typeof envTrackingId === 'string' && envTrackingId) {
    return envTrackingId;
  }

  // No tracking ID available - this prevents data pollution
  console.warn(
    'Google Analytics: No tracking ID configured. Analytics disabled.'
  );
  return null;
};

/**
 * Check if Google Analytics should be enabled
 * Disabled in development to avoid polluting analytics data
 */
export const isAnalyticsEnabled = () => {
  // Guard against SSR and non-browser environments
  if (typeof window === 'undefined') {
    return false;
  }

  // Analytics are disabled in development to avoid polluting data
  if (!isProduction) {
    return false;
  }

  // Analytics are enabled by default unless the user has explicitly opted out.
  const hasConsent = localStorage.getItem('analytics-consent');
  // Fix: Default to enabled if no consent preference is set (null) or explicitly true
  return hasConsent === null || hasConsent === 'true';
};

/**
 * Safe gtag function that checks if analytics is enabled
 */
export const safeGtag = (
  command: 'config' | 'event' | 'js' | 'consent',
  targetId: string,
  config?: Record<string, unknown>
) => {
  const isValidTrackingId = typeof targetId === 'string' && !!targetId.trim();
  if (
    isAnalyticsEnabled() &&
    isValidTrackingId &&
    typeof window !== 'undefined' &&
    window.gtag
  ) {
    window.gtag(command, targetId, config);
  }
};

/**
 * Track page view safely
 */
export const trackPageView = (options?: {
  page_title?: string;
  page_location?: string;
  page_path?: string;
}) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    const trackingId = getGATrackingId();
    if (trackingId) {
      window.gtag('config', trackingId, {
        page_title: options?.page_title || document.title,
        page_location: options?.page_location || window.location.href,
        page_path: options?.page_path || window.location.pathname,
      });
    }
  }
};

/**
 * Track custom event safely
 */
export const trackEvent = (options: {
  category: string;
  action: string;
  label?: string;
  value?: number;
}) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', options.action, {
      event_category: options.category,
      event_label: options.label,
      value: options.value,
    });
  }
};

/**
 * Development logging for analytics events
 */
export const logAnalyticsEvent = (eventName: string, data?: unknown) => {
  if (isDevelopment) {
    console.log(`[Analytics] ${eventName}`, data);
  }
};

/**
 * Consent management for GDPR compliance
 */
export const setAnalyticsConsent = (consent: boolean) => {
  // Guard against SSR and non-browser environments
  if (typeof window === 'undefined') return;

  localStorage.setItem('analytics-consent', consent.toString());

  // Integrate with Google Analytics Consent Mode
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent ? 'granted' : 'denied',
    });
  }
};

export const getAnalyticsConsent = (): boolean => {
  // Guard against SSR and non-browser environments
  if (typeof window === 'undefined') return false;

  return localStorage.getItem('analytics-consent') === 'true';
};

/**
 * Track performance metrics
 */
export const trackPerformance = (metric: string, value: number) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'metric', {
      event_category: 'Performance',
      event_label: metric,
      value: Math.round(value),
    });
  }
};

/**
 * Track errors
 */
export const trackError = (errorType: string, errorMessage: string) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'error', {
      event_category: 'Error',
      event_label: `${errorType}: ${errorMessage}`,
    });
  }
};

/**
 * Debug helper to check current GA status
 * Only available in development mode.
 */
let debugGAStatus: (() => void) | undefined;

if (import.meta.env.DEV) {
  debugGAStatus = () => {
    if (typeof window === 'undefined') {
      console.log('[GA Debug] Running in non-browser environment');
      return;
    }

    console.group('[GA Debug] Current Status');
    console.log('Environment:', {
      isDevelopment,
      isProduction,
      NODE_ENV: import.meta.env.MODE,
    });
    console.log('Tracking ID:', getGATrackingId());
    console.log('Analytics enabled:', isAnalyticsEnabled());
    console.log(
      'Analytics consent:',
      localStorage.getItem('analytics-consent')
    );
    console.log('gtag available:', typeof window.gtag);
    console.log('dataLayer available:', Array.isArray(window.dataLayer));
    console.groupEnd();
  };
}

export { debugGAStatus };

/**
 * Test helper to manually fire a GA event
 */
export const testGAEvent = (eventName = 'test_event') => {
  if (typeof window === 'undefined') {
    console.log('[GA Test] Cannot test in non-browser environment');
    return;
  }

  console.log(`[GA Test] Attempting to fire test event: ${eventName}`);

  if (!window.gtag) {
    console.error('[GA Test] gtag not available');
    return;
  }

  if (!isAnalyticsEnabled()) {
    console.warn('[GA Test] Analytics not enabled');
    return;
  }

  try {
    window.gtag('event', eventName, {
      event_category: 'Test',
      event_label: 'Manual Test from debugGAStatus',
      value: 1,
    });
    console.log(`[GA Test] Successfully fired event: ${eventName}`);
  } catch (error) {
    console.error('[GA Test] Error firing event:', error);
  }
};
