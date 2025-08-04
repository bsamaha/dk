#!/usr/bin/env node

/**
 * Generates CSP header for nginx.conf from centralized configuration
 * This ensures consistency between frontend Vite config and nginx production config
 */

import { buildCSPHeader } from '../frontend/src/utils/csp.js';
import fs from 'fs';
import path from 'path';

const generateNginxCSP = () => {
  try {
    // Generate CSP header from centralized config
    const cspHeader = buildCSPHeader();

    // Read current nginx.conf
    const nginxConfigPath = path.join(process.cwd(), 'nginx.conf');
    let nginxConfig = fs.readFileSync(nginxConfigPath, 'utf8');

    // Replace the CSP header line
    const cspLinePattern = /add_header Content-Security-Policy ".*?" always;/;
    const newCSPLine = `add_header Content-Security-Policy "${cspHeader}" always;`;

    if (cspLinePattern.test(nginxConfig)) {
      nginxConfig = nginxConfig.replace(cspLinePattern, newCSPLine);
      console.log('✅ Updated existing CSP header in nginx.conf');
    } else {
      console.log('⚠️  CSP header pattern not found in nginx.conf');
      console.log('📋 Generated CSP header:');
      console.log(newCSPLine);
      return;
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
