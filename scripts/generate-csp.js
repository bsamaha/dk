#!/usr/bin/env node

/**
 * Generates CSP header for nginx.conf from centralized configuration
 * This ensures consistency between frontend Vite config and nginx production config
 */

import fs from 'fs';
import path from 'path';

// Import the CSP directives directly to avoid TypeScript import issues
const CSP_DIRECTIVES = {
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
  'connect-src': [
    "'self'",
    'http://localhost:*',
    'https://thesignalcallers.com',
    'ws://localhost:*',
    'wss://localhost:*',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net',
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
const buildCSPHeader = () => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

const generateNginxCSP = () => {
  try {
    // Generate CSP header from centralized config
    const cspHeader = buildCSPHeader();

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
