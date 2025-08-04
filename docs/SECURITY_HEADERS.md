# Security Headers Implementation

## Overview

This document describes the security headers implemented in the frontend application to protect against common web vulnerabilities.

## Implementation Location

- **Vite Configuration**: `frontend/vite.config.ts`
- **HTML Meta Tags**: `frontend/index.html`
- **Tests**: `frontend/src/__tests__/security-headers.test.ts`

## Security Headers Implemented

### 1. X-Content-Type-Options: nosniff

- **Purpose**: Prevents MIME type sniffing attacks
- **Protection**: Stops browsers from guessing content types and executing malicious files
- **Risk Mitigated**: Content injection attacks

### 2. X-Frame-Options: DENY

- **Purpose**: Prevents clickjacking attacks
- **Protection**: Stops the application from being embedded in iframes
- **Risk Mitigated**: Clickjacking, UI redressing attacks

### 3. X-XSS-Protection: 1; mode=block

- **Purpose**: Enables browser's built-in XSS protection
- **Protection**: Blocks reflected XSS attacks
- **Risk Mitigated**: Cross-site scripting attacks

### 4. Referrer-Policy: strict-origin-when-cross-origin

- **Purpose**: Controls referrer information sent to other sites
- **Protection**: Limits information leakage in referrer headers
- **Risk Mitigated**: Information disclosure

### 5. Content-Security-Policy (CSP)

Comprehensive policy that controls resource loading:

```javascript
[
  "default-src 'self'",                                    // Only same-origin resources by default
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",      // Scripts from same origin + inline (React)
  "style-src 'self' 'unsafe-inline'",                     // Styles from same origin + inline (Tailwind/Mantine)
  "img-src 'self' data: https:",                          // Images from same origin, data URIs, HTTPS
  "font-src 'self' data:",                                // Fonts from same origin and data URIs
  "connect-src 'self' http://localhost:8000 https://thesignalcallers.com", // API connections
  "frame-ancestors 'none'",                               // No embedding in frames
  "base-uri 'self'",                                      // Base URI restrictions
  "form-action 'self'"                                     // Form submissions only to same origin
].join('; ')
```

### 6. Permissions-Policy

- **Purpose**: Controls browser features and APIs
- **Settings**: Disables geolocation, microphone, and camera access
- **Protection**: Prevents unauthorized access to sensitive browser APIs

### 7. X-Download-Options: noopen

- **Purpose**: Prevents automatic file downloads
- **Protection**: Stops malicious file downloads from executing automatically

### 8. X-Permitted-Cross-Domain-Policies: none

- **Purpose**: Restricts cross-domain policy files
- **Protection**: Prevents cross-domain data access

## Development vs Production

### Development Server

- Headers applied via Vite's `server.headers` configuration
- Includes localhost API connections in CSP
- Allows development tools and hot reloading

### Production Build

- Headers applied via Vite's `preview.headers` configuration
- Stricter CSP policy for production
- Optimized for security and performance

## Testing

Run the security headers test suite:

```bash
cd frontend
npm test -- security-headers.test.ts
```

## Verification

To verify headers are working:

1. **Development**: Start dev server and check browser dev tools Network tab
2. **Production**: Build and preview, then check headers
3. **Automated**: Run the test suite

## Security Benefits

### Protected Against

- ✅ Cross-site scripting (XSS)
- ✅ Clickjacking attacks
- ✅ MIME type sniffing
- ✅ Content injection
- ✅ Information disclosure
- ✅ Unauthorized API access
- ✅ Malicious file downloads
- ✅ Cross-domain attacks

### Compliance

- ✅ OWASP Top 10 protection
- ✅ Modern browser security standards
- ✅ Content Security Policy Level 3
- ✅ Security headers best practices

## Maintenance

### When to Update

- Adding new external resources (CDNs, APIs)
- Changing application architecture
- Security policy updates
- Browser compatibility issues

### Update Process

1. Modify headers in `vite.config.ts`
2. Update tests in `security-headers.test.ts`
3. Test in development and production
4. Update this documentation

## References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers Best Practices](https://securityheaders.com/)
