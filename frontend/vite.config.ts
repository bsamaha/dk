import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getDevCSPHeader, getProdCSPHeader } from './csp.shared.js';
import { visualizer } from 'rollup-plugin-visualizer';

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
      exclude: [
        'tests/e2e/**',
        'node_modules/**',
        'dist/**',
      ],
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
      // Prevent multiple React copies (fixes hooks like useLayoutEffect being undefined)
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        // Let Vite handle chunking by default to avoid interop/ordering issues
        plugins: [
          env.VITE_VISUALIZE === 'true'
            ? visualizer({ filename: 'dist/stats.html', template: 'treemap' })
            : undefined,
        ].filter(Boolean) as unknown as []
      },
      chunkSizeWarningLimit: 1200,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@mantine/core',
        '@mantine/hooks',
        '@mantine/notifications',
        '@tanstack/react-query',
        'recharts',
        'axios',
      ],
      exclude: [
        '@tanstack/react-query-devtools',
      ],
    },
    server: {
      host: env.VITE_HOST || 'localhost',
      port: parseInt(env.VITE_PORT || '5173'),
      headers: {
        ...securityHeaders,
        'Content-Security-Policy': getDevCSPHeader(),
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
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
