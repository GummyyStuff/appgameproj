# Browser Cache Fix - HTML File Caching Issue

## Problem

The website wasn't loading because the browser was caching the old HTML file that referenced non-existent JavaScript files like `/js/useTouchInteractions-CSD2DUGs.js`.

## Root Cause

The backend was setting aggressive cache headers for ALL static files including HTML:

```typescript
// OLD CODE - cached everything for 1 year
c.header('Cache-Control', 'public, max-age=31536000, immutable')
```

This meant:
1. Browser cached the old HTML file
2. Old HTML referenced old chunk files that no longer exist
3. Browser tried to load `/js/useTouchInteractions-CSD2DUGs.js` which doesn't exist
4. Website appeared broken

## Solution

Updated the cache headers to:
1. **Never cache HTML files** - Always serve fresh HTML
2. **Cache static assets** - Cache JS/CSS/fonts for 1 year (they have content hashes)

### Changes Made

**File**: `/packages/backend/src/index.ts`

**Before:**
```typescript
// Set cache headers for static assets
c.header('Cache-Control', 'public, max-age=31536000, immutable')
```

**After:**
```typescript
// Set cache headers based on file type
if (path.endsWith('.html')) {
  // Don't cache HTML files - always serve fresh
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  c.header('Pragma', 'no-cache')
  c.header('Expires', '0')
} else if (path.match(/\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$/)) {
  // Cache static assets for 1 year (they have content hashes in their names)
  c.header('Cache-Control', 'public, max-age=31536000, immutable')
}
```

Also updated the SPA fallback handler to not cache HTML:

```typescript
// Don't cache HTML files - always serve fresh
c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
c.header('Pragma', 'no-cache')
c.header('Expires', '0')
```

## How It Works

### HTML Files (index.html)
- **Cache**: `no-cache, no-store, must-revalidate`
- **Reason**: HTML references specific chunk files that change with each build
- **Result**: Browser always fetches fresh HTML

### Static Assets (JS, CSS, fonts, images)
- **Cache**: `public, max-age=31536000, immutable`
- **Reason**: These files have content hashes in their names (e.g., `chunk-taj17t6b.js`)
- **Result**: Browser caches them for 1 year since the hash changes when content changes

## User Action Required

Since the old HTML is already cached in the browser, users need to do a **hard refresh**:

### Windows/Linux:
- **Chrome/Edge**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox**: `Ctrl + Shift + R` or `Ctrl + F5`

### Mac:
- **Chrome/Edge**: `Cmd + Shift + R`
- **Firefox**: `Cmd + Shift + R`
- **Safari**: `Cmd + Option + R`

### Alternative:
Clear browser cache:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Verification

After the fix, the logs should show:
```
✅ GET / - 200 (0ms)
✅ GET /chunk-taj17t6b.js - 200 (0ms)
✅ GET /chunk-ygz40k48.css - 200 (0ms)
```

No more errors like:
```
❌ [NOT FOUND] Static file not found: public/js/useTouchInteractions-CSD2DUGs.js
```

## Benefits

1. **Always Fresh HTML**: Users always get the latest HTML with correct chunk references
2. **Fast Static Assets**: JS/CSS/fonts are cached for 1 year (faster page loads)
3. **Automatic Cache Busting**: Content hashes in filenames ensure old assets are never served
4. **No Manual Cache Clearing**: Users don't need to manually clear cache (hard refresh once is enough)

## Testing

To verify the fix:

1. **Check HTML is not cached**:
   ```bash
   curl -I https://tarkov.juanis.cool/
   ```
   Should show: `Cache-Control: no-cache, no-store, must-revalidate`

2. **Check JS is cached**:
   ```bash
   curl -I https://tarkov.juanis.cool/chunk-taj17t6b.js
   ```
   Should show: `Cache-Control: public, max-age=31536000, immutable`

3. **Visit the website**:
   - Do a hard refresh (Ctrl+Shift+R)
   - Website should load correctly
   - No 404 errors for JS/CSS files

## Production Deployment

After deploying this fix:

1. **Deploy the backend** with the new cache headers
2. **Users need to hard refresh once** to get the new HTML
3. **Future updates** will work automatically (no hard refresh needed)

## References

- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [Bun Static File Serving](https://bun.sh/docs/api/http#static-routes)
- [HTTP Caching Best Practices](https://web.dev/http-cache/)

