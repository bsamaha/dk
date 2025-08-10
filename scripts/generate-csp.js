#!/usr/bin/env node

/**
 * Generates CSP header for nginx.conf from centralized configuration
 * This ensures consistency between frontend Vite config and nginx production config
 */

const fs = require('fs');
const path = require('path');

// Import the CSP directives directly to avoid TypeScript import issues
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Note: dev allows eval/inline; prod will strip these before writing to nginx
    "'unsafe-eval'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    'data:',
    'blob:',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
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

/**
 * Build CSP header value from directives
 */
const buildCSPHeader = directives =>
  Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

const generateNginxCSP = () => {
  try {
    // Generate CSP header from centralized config
    // Build production header: strip eval/inline/data/blob from script-src
    const prodDirectives = JSON.parse(JSON.stringify(CSP_DIRECTIVES));
    prodDirectives['script-src'] = prodDirectives['script-src'].filter(
      s => !["'unsafe-eval'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'data:', 'blob:'].includes(s)
    );
    // Allow youtube-nocookie in frame-src
    if (!prodDirectives['frame-src'].includes('https://www.youtube-nocookie.com')) {
      prodDirectives['frame-src'].push('https://www.youtube-nocookie.com');
    }
    const cspHeader = buildCSPHeader(prodDirectives);

    // Read current nginx.conf
    const nginxConfigPath = path.join(process.cwd(), 'nginx.conf');
    let nginxConfig = fs.readFileSync(nginxConfigPath, 'utf8');

        // Look for template markers for safer replacement
    const startMarker = '# BEGIN_CSP_HEADER';
    const endMarker = '# END_CSP_HEADER';
    const newCSPBlock = `${startMarker}
    add_header Content-Security-Policy "${cspHeader}" always;
    ${endMarker}`;

    if (nginxConfig.includes(startMarker) && nginxConfig.includes(endMarker)) {
      // Replace content between markers
      const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g');
      nginxConfig = nginxConfig.replace(regex, newCSPBlock);
      console.log('✅ Updated CSP header using template markers');
    } else {
      // Fallback to regex pattern for backward compatibility
      const cspLinePattern = /add_header Content-Security-Policy ".*?" always;/;
      const newCSPLine = `add_header Content-Security-Policy "${cspHeader}" always;`;

      if (cspLinePattern.test(nginxConfig)) {
        nginxConfig = nginxConfig.replace(cspLinePattern, newCSPLine);
        console.log('✅ Updated existing CSP header using regex fallback');
      } else {
        console.log('⚠️  No CSP markers or pattern found in nginx.conf');
        console.log('📋 Add these markers around your CSP header:');
        console.log(newCSPBlock);
        return;
      }
    }

    // Write back to nginx.conf
    fs.writeFileSync(nginxConfigPath, nginxConfig);
    console.log('🚀 nginx.conf updated successfully');

  } catch (error) {
    console.error('❌ Error generating CSP for nginx:', error.message);
    process.exit(1);
  }
};

// Add this to package.json scripts: "generate-csp": "node scripts/generate-csp.js"
generateNginxCSP();
