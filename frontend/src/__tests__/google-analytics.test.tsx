import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';
import React from 'react';

// Mock window.gtag
const mockGtag = vi.fn();
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'dataLayer', {
  value: [],
  writable: true,
  configurable: true,
});

// Mock the analytics utility with proper gtag calls
vi.mock('../utils/analytics', () => ({
  isAnalyticsEnabled: vi.fn(() => true),
  getGATrackingId: vi.fn(() => 'G-951R3NH68H'),
  trackPageView: vi.fn(options => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'G-951R3NH68H', {
        page_title: options?.page_title || document.title,
        page_location: options?.page_location || window.location.href,
        page_path: options?.page_path || window.location.pathname,
      });
    }
  }),
  trackEvent: vi.fn(options => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', options.action, {
        event_category: options.category,
        event_label: options.label,
        value: options.value,
      });
    }
  }),
  trackError: vi.fn(),
  trackPerformance: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  // Add the new debug functions
  debugGAStatus: vi.fn(),
  testGAEvent: vi.fn(),
}));

// Test component to wrap the hook
const TestComponent = ({
  onHook,
}: {
  onHook: (hook: ReturnType<typeof useGoogleAnalytics>) => void;
}) => {
  const hook = useGoogleAnalytics();
  React.useEffect(() => {
    onHook(hook);
  }, [hook, onHook]);
  return <div>Test Component</div>;
};

describe('Google Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track page views', () => {
    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      (hookResult as ReturnType<typeof useGoogleAnalytics>).trackPageView({
        page_title: 'Test Page',
        page_path: '/test',
      });

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-951R3NH68H', {
        page_title: 'Test Page',
        page_location: expect.any(String),
        page_path: '/test',
      });
    }
  });

  it('should track custom events', () => {
    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      (hookResult as ReturnType<typeof useGoogleAnalytics>).trackEvent({
        category: 'Test Category',
        action: 'test_action',
        label: 'test_label',
        value: 123,
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_action', {
        event_category: 'Test Category',
        event_label: 'test_label',
        value: 123,
      });
    }
  });

  it('should track player search events', () => {
    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      (hookResult as ReturnType<typeof useGoogleAnalytics>).trackPlayerSearch(
        'Dobbins',
        5
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'search', {
        event_category: 'Player Search',
        event_label: 'Dobbins',
        value: 5,
      });
    }
  });

  it('should track player details events', () => {
    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      (hookResult as ReturnType<typeof useGoogleAnalytics>).trackPlayerDetails(
        'J.K. Dobbins',
        'RB',
        'BAL'
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'view', {
        event_category: 'Player Details',
        event_label: 'J.K. Dobbins (RB, BAL)',
      });
    }
  });

  it('should track position filter events', () => {
    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      (hookResult as ReturnType<typeof useGoogleAnalytics>).trackPositionFilter(
        'RB'
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'position_filter', {
        event_category: 'Filter',
        event_label: 'RB',
      });
    }
  });

  it('should handle missing gtag gracefully', () => {
    // Temporarily remove gtag
    const originalGtag = window.gtag;
    delete (window as unknown as Record<string, unknown>).gtag;

    let hookResult: ReturnType<typeof useGoogleAnalytics> | null = null;

    render(
      <TestComponent
        onHook={hook => {
          hookResult = hook;
        }}
      />
    );

    expect(hookResult).toBeTruthy();
    if (hookResult) {
      // Should not throw
      expect(() => {
        (hookResult as ReturnType<typeof useGoogleAnalytics>).trackEvent({
          category: 'Test',
          action: 'test',
        });
      }).not.toThrow();
    }

    // Restore gtag
    (window as unknown as Record<string, unknown>).gtag = originalGtag;
  });
});
