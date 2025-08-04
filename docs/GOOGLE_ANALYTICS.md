# Google Analytics Implementation

This document describes the Google Analytics implementation for TheSignalCallers application.

## Overview

Google Analytics has been integrated to track user interactions and provide insights into application usage. The implementation is environment-aware and only loads in production to avoid polluting analytics data during development.

## Configuration

### Tracking ID

- **GA4 Property ID**: Configurable via environment variables
- **Environment**: Production only (disabled in development)
- **Dynamic Configuration**: Supports build-time environment variable override
- **Environment Variable**: `VITE_GA_TRACKING_ID` for custom tracking IDs
- **Data Pollution Prevention**: No hardcoded fallback - analytics disabled if no ID configured

### Security Headers

The Content Security Policy (CSP) has been centralized to avoid duplication and ensure consistency across environments. CSP directives are managed in `frontend/src/utils/csp.ts`:

```typescript
// Centralized CSP configuration
export const CSP_DIRECTIVES = {
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Vite dev server and chart libraries
    "'unsafe-inline'", // Required for Mantine components
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
  // ... other directives
};
```

**Security Notes:**

- `'unsafe-eval'` and `'unsafe-inline'` are required for Vite development server and Mantine UI components
- These directives are documented and should be reviewed periodically for removal opportunities
- CSP configuration is shared between Vite dev/preview and Nginx production

## Implementation Details

### 1. HTML Integration

Google Analytics is loaded using a separate TypeScript module that's processed by Vite:

```html
<!-- Google Analytics initialization (processed by Vite) -->
<script type="module" src="/src/ga-init.ts"></script>
```

The initialization script (`frontend/src/ga-init.ts`) handles environment detection and setup:

```typescript
// Environment detection
const isProduction = import.meta.env.PROD;
const gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID;

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
import { useGoogleAnalytics, usePageTracking } from '../hooks/useGoogleAnalytics';

const { trackPlayerSearch, trackPlayerDetails, trackEvent } = useGoogleAnalytics();

// Automatic page tracking (pass current view)
usePageTracking(currentView);

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
- **Client-Side Routing**: Tracks both browser navigation and programmatic route changes

### Player Interactions

- **Player Search**: Tracks search terms and actual result counts (2-second debounce using reusable hook)
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
- **Errors**: Tracks application errors with sanitized messages (React errors, API errors, validation errors)
- **Performance**: Tracks API call performance and response times
- **API Monitoring**: Automatic tracking of all API requests/responses
- **Filter Clearing**: Tracks when position filters are cleared (not just applied)

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
5. **Consent Management**: Users can opt-out via `setAnalyticsConsent(false)` with GA consent mode integration

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

### Consent Management Integration

Google Analytics consent mode is automatically updated when user consent changes:

```typescript
setAnalyticsConsent(false); // Disables analytics and updates GA consent mode
```

### Search Result Tracking

Player searches now track actual result counts using a reusable debounced hook with browser-compatible timeouts:

```typescript
import { useAnalyticsDebounce } from '../../hooks/useDebounce';

// Create debounced version of trackPlayerSearch
const debouncedTrackPlayerSearch = useAnalyticsDebounce(trackPlayerSearch, 2000);

useEffect(() => {
  if (playersData && searchTerm.trim()) {
    debouncedTrackPlayerSearch(searchTerm.trim(), playersData.total_count || 0);
  }
}, [playersData, searchTerm, debouncedTrackPlayerSearch]);
```

### Environment Variable Processing

Google Analytics initialization now uses proper Vite environment variable processing:

```typescript
// This is processed by Vite build system
const isProduction = import.meta.env.PROD;
const gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID;

// Only load GA in production with valid tracking ID
if (isProduction && gaTrackingId) {
  // Initialize Google Analytics
}
```

### Error Message Sanitization

All error messages are sanitized before being sent to analytics to prevent sensitive data leakage:

```typescript
import { sanitizeErrorMessage, sanitizeErrorType } from '../utils/errorSanitization';

const trackError = useCallback(
  (errorType: string, errorMessage: string) => {
    const sanitizedType = sanitizeErrorType(errorType);
    const sanitizedMessage = sanitizeErrorMessage(errorMessage);

    trackEvent({
      category: 'Error',
      action: 'error',
      label: `${sanitizedType}: ${sanitizedMessage}`,
    });
  },
  [trackEvent]
);
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
