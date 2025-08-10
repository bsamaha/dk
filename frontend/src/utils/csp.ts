/**
 * Content Security Policy configuration
 * Centralized CSP directives to avoid duplication and drift
 *
 * NOTE: Changes to CSP_DIRECTIVES must be manually synced to scripts/generate-csp.js
 * TODO: Consider creating a shared JSON config file that both can import
 */

// Re-export from shared CSP to keep a single source of truth (ESM)
export { CSP_DIRECTIVES, getDevCSPHeader, getProdCSPHeader } from '../../csp.shared.js';

/**
 * CSP Security Notes:
 *
 * 'unsafe-eval' and 'unsafe-inline' are required for:
 * - Vite development server hot reload
 * - Mantine UI components (inline styles and dynamic components)
 * - Chart libraries that generate dynamic content
 *
 * TODO: Periodically review these directives and check for:
 * - Updates to Mantine that reduce inline script usage
 * - Alternative chart libraries with better CSP compliance
 * - Vite updates that reduce eval usage
 */
