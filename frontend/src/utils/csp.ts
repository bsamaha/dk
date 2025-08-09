/**
 * Content Security Policy configuration
 * Centralized CSP directives to avoid duplication and drift
 *
 * NOTE: Changes to CSP_DIRECTIVES must be manually synced to scripts/generate-csp.js
 * TODO: Consider creating a shared JSON config file that both can import
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Vite dev server and some chart libraries
    "'unsafe-inline'", // Required for Mantine components and inline scripts
    "'wasm-unsafe-eval'", // Required for Vite
    'data:',
    'blob:',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com', // Regional GA endpoints
    'https://region1.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Mantine components
    'data:',
    'https://fonts.googleapis.com',
    'https:',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https:'],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
    'https://www.google-analytics.com',
    'https://stats.g.doubleclick.net',
  ],
  'media-src': ["'self'", 'data:', 'blob:'],
  'frame-src': [
    "'self'",
    'https://open.spotify.com',
    'https://www.youtube.com',
    'https://youtube.com',
  ],
  'connect-src': [
    "'self'",
    'http://localhost:*',
    'https://thesignalcallers.com',
    'ws://localhost:*',
    'wss://localhost:*',
    'https://*.google-analytics.com',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net',
    'https://region1.google-analytics.com',
    'https://region1.analytics.google.com',
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'worker-src': ["'self'", 'blob:', 'data:'],
  'child-src': ["'self'", 'blob:'],
} as const;

/**
 * Build CSP header value from directives
 */
export const buildCSPHeader = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

/**
 * Get CSP header for development environment
 */
export const getDevCSPHeader = (): string => {
  return buildCSPHeader();
};

/**
 * Get CSP header for production environment
 */
export const getProdCSPHeader = (): string => {
  return buildCSPHeader();
};

/**
 * CSP Security Notes:
 *
 * 'unsafe-eval' and 'unsafe-inline' are required for:
 * - Vite development server hot reload
 * - Mantine UI components (inline styles and dynamic components)
 * - Chart libraries that generate dynamic content
 *
 * TODO: Periodically review these directives and check for:
 * - Updates to Mantine that reduce inline script usage
 * - Alternative chart libraries with better CSP compliance
 * - Vite updates that reduce eval usage
 */
