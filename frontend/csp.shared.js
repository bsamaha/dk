// Shared CSP configuration for both dev server and production nginx (ESM)

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Dev-only relaxations (stripped in production header below)
    "'unsafe-eval'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    'data:',
    'blob:',
    // GA endpoints
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://region1.google-analytics.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Mantine requires inline styles
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
    'https://www.youtube-nocookie.com',
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
    // Allow YouTube/Google logging for embedded players
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://*.googlevideo.com',
    'https://play.google.com',
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'worker-src': ["'self'", 'blob:', 'data:'],
  'child-src': ["'self'", 'blob:'],
};

export function buildCSPHeader(directives) {
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

export function getDevCSPHeader() {
  return buildCSPHeader(CSP_DIRECTIVES);
}

export function getProdCSPHeader() {
  const prodDirectives = JSON.parse(JSON.stringify(CSP_DIRECTIVES));
  const devScriptSrc = prodDirectives['script-src'] || [];
  prodDirectives['script-src'] = devScriptSrc.filter(s =>
    !["'unsafe-eval'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'data:', 'blob:'].includes(s)
  );
  return buildCSPHeader(prodDirectives);
}

// ESM named exports above
