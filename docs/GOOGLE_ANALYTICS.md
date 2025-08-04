# Google Analytics Implementation

This document describes the Google Analytics implementation for TheSignalCallers application.

## Overview

Google Analytics has been integrated to track user interactions and provide insights into application usage. The implementation is environment-aware and only loads in production to avoid polluting analytics data during development.

## Configuration

### Tracking ID

- **GA4 Property ID**: `G-951R3NH68H` (configurable via environment)
- **Environment**: Production only (disabled in development)
- **Dynamic Configuration**: Supports build-time environment variable override
- **Environment Variable**: `VITE_GA_TRACKING_ID` for custom tracking IDs

### Security Headers

The Content Security Policy (CSP) has been updated to allow Google Analytics domains:

```nginx
# Nginx CSP Configuration
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.google-analytics.com https://stats.g.doubleclick.net; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net;" always;
```

## Implementation Details

### 1. HTML Integration

Google Analytics is loaded conditionally in `frontend/index.html`:

```html
<!-- Google Analytics -->
<script>
  // Only load Google Analytics in production
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Get GA tracking ID from environment or use default
    const gaTrackingId = 'G-951R3NH68H'; // Default ID, can be overridden via build process

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`;
    document.head.appendChild(script);

    // Initialize Google Analytics
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', gaTrackingId);

    // Make gtag globally available for React app
    window._gaTrackingId = gaTrackingId;
  }
</script>
```

### 2. React Hook

The `useGoogleAnalytics` hook provides easy-to-use tracking functions:

```typescript
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics';

const { trackPlayerSearch, trackPlayerDetails, trackEvent } = useGoogleAnalytics();

// Track player search
trackPlayerSearch('Dobbins', 5);

// Track player details view
trackPlayerDetails('J.K. Dobbins', 'RB', 'BAL');

// Track custom event
trackEvent({
  category: 'Analytics',
  action: 'view',
  label: 'heat_map',
});
```

### 3. Environment-Aware Configuration

The `frontend/src/utils/analytics.ts` utility provides environment-aware tracking with dynamic tracking ID support:

```typescript
// Dynamic tracking ID (can be set via build process)
export const getGATrackingId = () => {
  // Try to get from window (set by HTML script) or use default
  return (window as any)?._gaTrackingId || 'G-951R3NH68H';
};

// Only enabled in production
export const isAnalyticsEnabled = () => {
  return import.meta.env.PROD;
};

// Safe tracking functions
export const trackEvent = (options) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', options.action, {
      event_category: options.category,
      event_label: options.label,
      value: options.value,
    });
  }
};

// Performance tracking
export const trackPerformance = (metric: string, value: number) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'metric', {
      event_category: 'Performance',
      event_label: metric,
      value: Math.round(value),
    });
  }
};

// Error tracking
export const trackError = (errorType: string, errorMessage: string) => {
  if (isAnalyticsEnabled() && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'error', {
      event_category: 'Error',
      event_label: `${errorType}: ${errorMessage}`,
    });
  }
};
```

## Tracked Events

### Page Views

- **Automatic**: All page views are tracked via `usePageTracking` hook
- **Manual**: Custom page views can be tracked with `trackPageView()`

### Player Interactions

- **Player Search**: Tracks search terms and actual result counts (debounced to avoid excessive events)
- **Player Details**: Tracks when users view specific player details
- **Position Filters**: Tracks position filter usage with selected positions

### Analytics Views

- **Heat Map**: Tracks heat map analytics views
- **Stacks**: Tracks stack analytics views
- **Draft Slot**: Tracks draft slot correlation views
- **Combinations**: Tracks player combination searches

### User Actions

- **Sorting**: Tracks table column sorting
- **Export**: Tracks data export actions
- **Errors**: Tracks application errors (React errors, API errors, validation errors)
- **Performance**: Tracks API call performance and response times
- **API Monitoring**: Automatic tracking of all API requests/responses

## Event Categories

| Category | Description | Actions |
|----------|-------------|---------|
| `Player Search` | Player search functionality with result counts | `search` |
| `Player Details` | Individual player views | `view` |
| `Filter` | Filter interactions | `position_filter` |
| `Analytics` | Analytics page views | `view` |
| `Combinations` | Player combination searches | `search` |
| `Table` | Table interactions | `sort` |
| `Export` | Data export actions | `export` |
| `Error` | Application errors (React, API, Validation) | `error` |
| `Performance` | API performance metrics | `metric` |

## Development vs Production

### Development Environment

- Google Analytics script is not loaded
- All tracking functions log to console instead
- No data is sent to Google Analytics

### Production Environment

- Google Analytics script loads automatically
- All tracking functions send data to GA4
- Full analytics data collection

## Testing

Run the Google Analytics tests:

```bash
cd frontend
npm test -- google-analytics.test.tsx
```

The test suite covers:

- Page view tracking
- Custom event tracking
- Player search tracking
- Player details tracking
- Position filter tracking
- Error handling (missing gtag)
- All tracking functions with proper mocking

## Privacy Considerations

1. **No Personal Data**: Only anonymous usage data is collected
2. **No User Identification**: No user accounts or personal information tracked
3. **GDPR Compliant**: Implements consent management and standard Google Analytics privacy controls
4. **Development Safe**: No tracking in development environment
5. **Consent Management**: Users can opt-out via `setAnalyticsConsent(false)`

## Troubleshooting

### Common Issues

1. **CSP Violations**: Check that Google Analytics domains are allowed in CSP
2. **Script Not Loading**: Verify the conditional loading logic in `index.html`
3. **Events Not Tracking**: Check browser console for errors
4. **Development Data**: Ensure you're testing in production environment

### Debug Mode

In development, analytics events are logged to console:

```javascript
[Analytics] page_view {page_title: "Player Analysis", page_path: "/players"}
[Analytics] custom_event {category: "Player Search", action: "search", label: "Dobbins"}
[Analytics] performance {metric: "API /players", value: 245.67}
[Analytics] error {errorType: "API Response", errorMessage: "500 - /analytics/heat-map"}
```

## Advanced Implementation Details

### API Performance Monitoring

The application automatically tracks API performance using Axios interceptors:

```typescript
// Request interceptor adds timestamp
api.interceptors.request.use(config => {
  config.metadata = { startTime: performance.now() };
  return config;
});

// Response interceptor tracks performance and errors
api.interceptors.response.use(
  response => {
    const duration = performance.now() - response.config.metadata.startTime;
    trackPerformance(`API ${endpoint}`, duration);
    return response;
  },
  error => {
    trackError('API Response', `${status} - ${endpoint}`);
    return Promise.reject(error);
  }
);
```

### Error Tracking Integration

React ErrorBoundary automatically tracks render errors:

```typescript
componentDidCatch(error: Error, errorInfo: unknown) {
  trackError('React Error Boundary', `${error.name}: ${error.message}`);
}
```

### Search Result Tracking

Player searches now track actual result counts when data loads:

```typescript
useEffect(() => {
  if (playersData && searchTerm.trim()) {
    trackPlayerSearch(searchTerm.trim(), playersData.total_count || 0);
  }
}, [playersData, searchTerm, trackPlayerSearch]);
```

## Future Enhancements

1. **Enhanced E-commerce Tracking**: Track draft-related conversions
2. **Custom Dimensions**: Add user segment tracking
3. **Goal Tracking**: Set up conversion goals
4. **Real-time Reports**: Monitor live user activity
5. **A/B Testing**: Integrate with Google Optimize
6. **Advanced Performance Metrics**: Track Core Web Vitals
7. **User Journey Tracking**: Monitor user flow through the application

## References

- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [gtag.js Reference](https://developers.google.com/tag-platform/gtagjs/reference)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
