# CSP Generation CI/CD Verification Guide

## Overview

The Content Security Policy (CSP) header generation for nginx.conf needs to be verified in CI/CD to ensure production doesn't serve stale policies.

## Current Setup

- **CSP Configuration**: Centralized in `frontend/src/utils/csp.ts`
- **Generation Script**: `scripts/generate-csp.js` (now with fixed imports)
- **NPM Script**: `npm run generate-csp` (added to package.json)
- **Nginx Integration**: Uses template markers `# BEGIN_CSP_HEADER` and `# END_CSP_HEADER`

## CI/CD Integration Options

### Option 1: Add to Build Process (Recommended)

Add CSP generation to the CI workflow before deployment:

```yaml
# In .github/workflows/release.yml, add before Docker build:
- name: Generate CSP Header
  run: npm run generate-csp
```

### Option 2: Add to Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: generate-csp
      name: Generate CSP header for nginx
      entry: npm run generate-csp
      language: system
      files: frontend/src/utils/csp\.ts$
```

### Option 3: Add to Deployment Script

Modify `scripts/deploy.sh` to regenerate CSP on deployment.

## Verification Steps

### Manual Verification

1. **Test script execution**:

   ```bash
   npm run generate-csp
   ```

2. **Verify nginx.conf changes**:

   ```bash
   git diff nginx.conf
   ```

3. **Test nginx configuration**:

   ```bash
   docker compose exec nginx nginx -t
   ```

### Automated Verification

1. **Add to CI checks**:
   - Run `npm run generate-csp`
   - Check if nginx.conf is modified
   - Fail CI if CSP is out of sync

2. **Add nginx reload verification**:

   ```bash
   # In deployment script
   docker compose exec nginx nginx -s reload
   echo "Nginx reloaded successfully"
   ```

## Best Practices

1. **Keep CSP in sync**: Changes to `frontend/src/utils/csp.ts` must trigger CSP regeneration
2. **Version control**: Include generated nginx.conf changes in commits
3. **Testing**: Verify CSP headers in browser dev tools after deployment
4. **Monitoring**: Set up alerts for CSP violations in production

## Current Status

- ✅ Fixed import issues in generate-csp.js
- ✅ Added npm script for CSP generation
- ⚠️ CI/CD integration pending - choose option above
- ⚠️ Automated verification pending

## Next Steps

1. Choose CI/CD integration option (recommend Option 1)
2. Add automated verification to detect CSP drift
3. Document CSP update process for team
4. Set up CSP violation monitoring
