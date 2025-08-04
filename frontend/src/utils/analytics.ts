/**
 * Google Analytics configuration and utilities
 */

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Google Analytics Tracking ID (can be set dynamically)
export const getGATrackingId = (): string | null => {
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
  // Enable in production, disable in development
  if (!isProduction) return false;

  // Check for user consent (GDPR compliance)
  const hasConsent = localStorage.getItem('analytics-consent') === 'true';
  return hasConsent !== false; // Default to true if not set
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
  localStorage.setItem('analytics-consent', consent.toString());

  // Integrate with Google Analytics Consent Mode
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: consent ? 'granted' : 'denied',
    });
  }
};

export const getAnalyticsConsent = (): boolean => {
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
