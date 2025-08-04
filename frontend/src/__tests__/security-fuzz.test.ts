/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm, isValidSearchTerm } from '../utils/sanitization';

/**
 * Property-based and fuzz testing for input sanitization functions.
 * These tests generate various malicious payloads to ensure robust sanitization.
 */

describe('Sanitization Fuzz Tests', () => {
  const maliciousPayloads = [
    // XSS attempts
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>',
    'javascript:alert("xss")',
    'data:text/html,<script>alert("xss")</script>',

    // Event handler injections
    'onclick=alert("xss")',
    'onmouseover=alert("xss")',
    'onerror=alert("xss")',
    'onload=alert("xss")',

    // Protocol injections
    'javascript:void(0)',
    'vbscript:msgbox("xss")',
    'data:text/javascript,alert("xss")',

    // HTML entity attempts
    '&lt;script&gt;alert("xss")&lt;/script&gt;',
    '&#60;script&#62;alert("xss")&#60;/script&#62;',

    // Unicode/encoding attempts
    '%3Cscript%3Ealert("xss")%3C/script%3E',
    '\\u003cscript\\u003ealert("xss")\\u003c/script\\u003e',

    // Mixed case evasion
    '<ScRiPt>alert("xss")</ScRiPt>',
    'JavaScript:alert("xss")',
    'OnClIcK=alert("xss")',

    // Nested/complex payloads
    '<script><script>alert("xss")</script></script>',
    '<div><img src=x onerror=alert("xss")></div>',

    // Very long strings (potential buffer overflow)
    'A'.repeat(1000) + '<script>alert("xss")</script>',
    'x'.repeat(500) + 'javascript:alert("xss")',

    // Null bytes and special characters
    'test\x00<script>alert("xss")</script>',
    'test\n<script>alert("xss")</script>',
    'test\r<script>alert("xss")</script>',

    // SQL injection attempts (should be handled anyway)
    "'; DROP TABLE users; --",
    "' OR '1'='1",

    // Directory traversal attempts
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
  ];

  describe('sanitizeSearchTerm', () => {
    it('should remove script tags from all known XSS payloads', () => {
      maliciousPayloads.forEach(payload => {
        const sanitized = sanitizeSearchTerm(payload);

        // Should not contain script tags
        expect(sanitized).not.toMatch(/<script[^>]*>/i);
        expect(sanitized).not.toContain('</script>');

        // Should not contain angle brackets at all
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');

        // Should not contain javascript protocol
        expect(sanitized.toLowerCase()).not.toContain('javascript:');

        // Should not contain event handlers
        expect(sanitized.toLowerCase()).not.toMatch(/on\w+=/);
      });
    });

    it('should enforce length limits on all inputs', () => {
      maliciousPayloads.forEach(payload => {
        const sanitized = sanitizeSearchTerm(payload);
        expect(sanitized.length).toBeLessThanOrEqual(100);
      });
    });

    it('should handle edge cases gracefully', () => {
      // Empty/null inputs
      expect(sanitizeSearchTerm('')).toBe('');
      expect(sanitizeSearchTerm(null as any)).toBe('');
      expect(sanitizeSearchTerm(undefined as any)).toBe('');

      // Very long strings
      const veryLong = 'a'.repeat(1000);
      const sanitized = sanitizeSearchTerm(veryLong);
      expect(sanitized.length).toBe(100);
      expect(sanitized).toBe('a'.repeat(100));

      // Only dangerous characters
      expect(sanitizeSearchTerm('<>')).toBe('');
      expect(sanitizeSearchTerm('javascript:')).toBe('');
      expect(sanitizeSearchTerm('onclick=')).toBe('');
    });

    it('should preserve legitimate search terms', () => {
      const legitimateTerms = [
        'John Smith',
        'Aaron Rodgers',
        'Tom Brady Jr.',
        'D.K. Metcalf',
        "D'Andre Swift",
        'player123',
        'QB WR RB',
        'team-name',
        'search_term',
      ];

      legitimateTerms.forEach(term => {
        const sanitized = sanitizeSearchTerm(term);
        // Should be mostly unchanged (except for length limits)
        expect(sanitized).toBe(term.slice(0, 100).trim());
      });
    });
  });

  describe('isValidSearchTerm', () => {
    it('should reject all malicious payloads', () => {
      maliciousPayloads.forEach(payload => {
        expect(isValidSearchTerm(payload)).toBe(false);
      });
    });

    it('should reject overly long terms', () => {
      const longTerm = 'a'.repeat(101);
      expect(isValidSearchTerm(longTerm)).toBe(false);
    });

    it('should accept legitimate search terms', () => {
      const legitimateTerms = [
        'John Smith',
        'Aaron Rodgers',
        'Tom Brady Jr.',
        'D.K. Metcalf',
        "D'Andre Swift",
        'player123',
        'QB WR RB',
        'team-name',
        'search_term',
        '', // empty string should be valid
      ];

      legitimateTerms.forEach(term => {
        expect(isValidSearchTerm(term)).toBe(true);
      });
    });

    it('should reject terms with angle brackets', () => {
      expect(isValidSearchTerm('test<')).toBe(false);
      expect(isValidSearchTerm('test>')).toBe(false);
      expect(isValidSearchTerm('<test>')).toBe(false);
    });
  });

  describe('Combined sanitization and validation', () => {
    it('should sanitize then validate consistently', () => {
      maliciousPayloads.forEach(payload => {
        const sanitized = sanitizeSearchTerm(payload);
        const isValid = isValidSearchTerm(sanitized);

        // After sanitization, the result should always be valid
        expect(isValid).toBe(true);
      });
    });

    it('should be idempotent', () => {
      maliciousPayloads.forEach(payload => {
        const firstPass = sanitizeSearchTerm(payload);
        const secondPass = sanitizeSearchTerm(firstPass);

        // Sanitizing twice should yield the same result
        expect(secondPass).toBe(firstPass);
      });
    });
  });

  describe('Performance under load', () => {
    it('should handle rapid sanitization calls', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const payload = maliciousPayloads[i % maliciousPayloads.length];
        sanitizeSearchTerm(payload);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 1000 sanitizations in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });
});
