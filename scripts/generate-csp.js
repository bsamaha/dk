#!/usr/bin/env node

/**
 * Generates CSP header for nginx.conf from centralized configuration
 * This ensures consistency between frontend Vite config and nginx production config
 */

const fs = require('fs');
const path = require('path');

// Import the CSP directives directly to avoid TypeScript import issues
const path = require('path');
// Dynamically load ESM shared module from Node CJS script
async function loadShared() {
  const url = 'file://' + path.join(__dirname, '../frontend/csp.shared.js');
  const mod = await import(url);
  return mod;
}

/**
 * Build CSP header value from directives
 */

const generateNginxCSP = () => {
  try {
    // Generate CSP header from centralized config
    // Build production header from shared config
    const { getProdCSPHeader } = await loadShared();
    const cspHeader = getProdCSPHeader();

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
