import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getDevCSPHeader, getProdCSPHeader } from './src/utils/csp';
import { VitePluginRadar } from 'vite-plugin-radar';

// Shared security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const gaTrackingId = env.VITE_GA_TRACKING_ID;

  return {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
    },
    plugins: [
      react({
        include: '**/*.{jsx,tsx}',
      }),
      ...(isProduction && gaTrackingId
        ? [
            VitePluginRadar({
              analytics: {
                id: gaTrackingId,
                config: {
                  send_page_view: true,
                  allow_google_signals: true,
                  allow_ad_personalization_signals: true,
                },
                consentDefaults: {
                  analytics_storage: 'granted',
                  ad_storage: 'denied',
                  wait_for_update: 500,
                },
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    server: {
      host: env.VITE_HOST || 'localhost',
      port: parseInt(env.VITE_PORT || '5173'),
      headers: {
        ...securityHeaders,
        'Content-Security-Policy': getDevCSPHeader(),
      },
    },
    preview: {
      headers: {
        ...securityHeaders,
        'Content-Security-Policy': getProdCSPHeader(),
      },
    },
  };
});
