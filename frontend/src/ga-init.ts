/**
 * Google Analytics initialization script
 * This file is processed by Vite and can access import.meta.env
 */

// Environment detection
const isProduction = import.meta.env.PROD;
const gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID;

// Global types (gtag is already declared in useGoogleAnalytics.ts)
declare global {
  interface Window {
    dataLayer: unknown[];
    _gaTrackingId?: string;
  }
}

/**
 * Initialize Google Analytics if in production environment
 */
const initializeGoogleAnalytics = (): void => {
  // Only load Google Analytics in production
  if (!isProduction) {
    console.log('[GA] Analytics disabled in development');
    return;
  }

  // Only load if tracking ID is provided
  if (!gaTrackingId) {
    console.warn('[GA] No tracking ID configured (VITE_GA_TRACKING_ID)');
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`;
  document.head.appendChild(script);

  // Initialize Google Analytics
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]): void {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', gaTrackingId);

  // Make tracking ID globally available for React app
  window._gaTrackingId = gaTrackingId;

  console.log('[GA] Analytics initialized with ID:', gaTrackingId);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGoogleAnalytics);
} else {
  initializeGoogleAnalytics();
}
