import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getDevCSPHeader, getProdCSPHeader } from './csp.shared.js';

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
  const env = loadEnv(mode, process.cwd(), 'VITE_');

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
