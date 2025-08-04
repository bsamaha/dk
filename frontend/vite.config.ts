import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

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
export default defineConfig({
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
    host: process.env.VITE_HOST || 'localhost',
    port: parseInt(process.env.VITE_PORT || '5173'),
    headers: {
      // Security headers with proper CSP for Recharts and Google Analytics
      ...securityHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' data: blob: https://www.googletagmanager.com https://www.google-analytics.com",
        "style-src 'self' 'unsafe-inline' data: https://fonts.googleapis.com https:",
        "font-src 'self' data: https://fonts.gstatic.com https:",
        "img-src 'self' data: https: blob: https://www.google-analytics.com https://stats.g.doubleclick.net",
        "media-src 'self' data: blob:",
        "connect-src 'self' http://localhost:* https://thesignalcallers.com ws://localhost:* wss://localhost:* https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "worker-src 'self' blob: data:",
        "child-src 'self' blob:",
      ].join('; '),
    },
  },
  preview: {
    headers: {
      // Production-like security headers with Google Analytics support
      ...securityHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' data: blob: https://www.googletagmanager.com https://www.google-analytics.com",
        "style-src 'self' 'unsafe-inline' data: https://fonts.googleapis.com https:",
        "font-src 'self' data: https://fonts.gstatic.com https:",
        "img-src 'self' data: https: blob: https://www.google-analytics.com https://stats.g.doubleclick.net",
        "media-src 'self' data: blob:",
        "connect-src 'self' http://localhost:* https://thesignalcallers.com ws://localhost:* wss://localhost:* https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "worker-src 'self' blob: data:",
        "child-src 'self' blob:",
      ].join('; '),
    },
  },
});
