// Polyfills for older browsers or missing APIs

// Add global as window for browser compatibility
if (typeof global === 'undefined') {
  (window as typeof window & { global: typeof window }).global = window;
}

// Add minimal process.env for compatibility
if (
  typeof window !== 'undefined' &&
  !(window as unknown as Record<string, unknown>).process
) {
  (window as unknown as Record<string, unknown>).process = {
    env: {},
  };
}
