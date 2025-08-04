// Utility functions for lightweight user-input sanitization.
// These helpers focus on protecting against reflected XSS in search boxes and similar UI elements.
// If we ever need heavier-weight sanitisation, consider bringing in DOMPurify, but for now we keep it simple.

/**
 * Remove dangerous characters / protocols and limit length.
 * We purposely do NOT URI-encode the string so that components can still read it naturally.
 */
export function sanitizeSearchTerm(input: string): string {
  if (!input) return '';

  return (
    input
      .slice(0, 100) // hard cap length so huge payloads are impossible
      .replace(/[<>]/g, '') // strip angle brackets so <script> cannot appear
      // Strip common HTML entity encodings of angle brackets
      .replace(/&(lt|gt|#60|#62);/gi, '')
      // Remove dangerous protocol tricks
      .replace(/(javascript|vbscript|data):/gi, '')
      // Strip inline event handlers (onerror= etc.)
      .replace(/on\w+\s*=/gi, '')
      // Strip URL encoded angle brackets
      .replace(/%3[CE]/gi, '')
      // Strip unicode encoded characters
      .replace(/\\u00[0-9a-f]{2}/gi, '')
      // Strip SQL injection patterns
      .replace(/(--|\/\*|\*\/)/gi, '')
      .replace(/drop\s+table/gi, '')
      .replace(/'.*or.*'/gi, '')
      // Strip directory traversal
      .replace(/\.\.[/\\]/gi, '')
      // Strip null bytes and control characters
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, '')
      // Normalize whitespace and trim at the end for consistent results
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Lightweight validation – use when deciding whether to send a search term to the API.
 */
export function isValidSearchTerm(term: string): boolean {
  // Allow empty strings so users can clear the search box without triggering errors
  if (!term) return true;

  // Hard length cap
  if (term.length > 100) return false;

  // Check for any angle brackets (including in any case)
  if (/[<>]/.test(term)) return false;

  // Check for dangerous protocols (anywhere in the string)
  if (/(javascript|vbscript|data):/i.test(term)) return false;

  // Check for inline event handlers
  if (/on\w+\s*=/i.test(term)) return false;

  // Check for HTML entity encodings
  if (/&(lt|gt|#60|#62);/i.test(term)) return false;

  // Check for URL encoded angle brackets
  if (/%3[CE]/i.test(term)) return false;

  // Check for unicode encoded characters
  if (/\\u00[0-9a-f]{2}/i.test(term)) return false;

  // Check for SQL injection patterns
  if (/(--|\/\*|\*\/)/i.test(term)) return false;
  if (/drop\s+table/i.test(term)) return false;
  if (/'.*or.*'/i.test(term)) return false; // Simple OR injection pattern

  // Check for directory traversal
  if (/\.\.[/\\]/i.test(term)) return false;

  // Check for null bytes and control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(term)) return false;

  return true;
}
