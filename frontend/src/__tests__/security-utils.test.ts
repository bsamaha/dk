import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm, isValidSearchTerm } from '../utils/sanitization';
import { validateApiResponse } from '../utils/api-validation';
import { PlayersResponseSchema } from '../utils/api-validation';

describe('Security utilities', () => {
  it('sanitizeSearchTerm should strip script tags and dangerous patterns', () => {
    const malicious = "<script>alert('xss')</script>javascript:onload=alert(1)";
    const sanitized = sanitizeSearchTerm(malicious);
    expect(sanitized).not.toMatch(/[<>]/); // angle brackets removed
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toMatch(/on\w+=/);
    expect(sanitized.length).toBeLessThanOrEqual(100);
  });

  it('isValidSearchTerm should reject invalid input', () => {
    expect(isValidSearchTerm('normal search')).toBe(true);
    expect(isValidSearchTerm('<script>bad</script>')).toBe(false);
  });

  it('validateApiResponse should accept valid player payload', () => {
    const payload = {
      players: [
        {
          name: 'Player One',
          position: 'QB',
          team: 'ABC',
          avg_pick: 10,
          min_pick: 5,
          max_pick: 20,
          draft_percentage: 50,
        },
      ],
      total_count: 1,
      page_info: {
        total_count: 1,
        limit: 20,
        offset: 0,
        has_next: false,
        has_previous: false,
        current_page: 1,
        total_pages: 1,
      },
    };

    expect(() =>
      validateApiResponse(payload, PlayersResponseSchema)
    ).not.toThrow();
  });
});
