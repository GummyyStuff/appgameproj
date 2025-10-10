# Purge Cloudflare Cache After Deployment

## Problem
After deploying new frontend code, browsers are still loading old cached JavaScript files, even in incognito mode. This is because Cloudflare CDN is caching your static assets.

## Solution: Purge Cloudflare Cache

### Method 1: Purge Everything (Easiest)

1. Login to **Cloudflare Dashboard** (dash.cloudflare.com)
2. Select your domain: **juanis.cool**
3. Go to **Caching** in left sidebar
4. Click **Configuration**
5. Scroll to **Purge Cache** section
6. Click **Purge Everything**
7. Confirm the purge
8. Wait 30 seconds
9. Hard refresh browser (Ctrl+Shift+R)

### Method 2: Purge By URL (More Precise)

Purge specific files that changed:

1. Go to Cloudflare **Caching** > **Configuration**
2. Click **Custom Purge**
3. Select **Purge by URL**
4. Enter URLs:
   ```
   https://tarkov.juanis.cool/js/index-DCv913s9.js
   https://tarkov.juanis.cool/js/appwrite-vendor-DM8nau4v.js
   https://tarkov.juanis.cool/assets/index-DjjQabfU.css
   ```
5. Click **Purge**

### Method 3: Purge By Tag/Prefix (Advanced)

If you have cache tags configured:
1. Purge by **prefix**: `/js/*`, `/assets/*`
2. Or by **tag** if you've set them up

## Verify Cache is Cleared

After purging, verify:

```bash
# Check if Cloudflare is serving fresh content
curl -I https://tarkov.juanis.cool/js/index-DCv913s9.js

# Look for these headers:
# cf-cache-status: MISS (first request after purge)
# cf-cache-status: HIT (subsequent requests)
```

## Prevention: Cache Busting

Your Vite build already uses content hashes in filenames:
- `index-DCv913s9.js` (hash changes with content)
- `appwrite-vendor-DM8nau4v.js`

This means each deployment gets new filenames, so caching SHOULD work correctly.

## Alternative: Bypass Cache for Testing

Add `?v=2` to your URL to bypass cache:
```
https://tarkov.juanis.cool/?v=2
```

Or in Coolify, add a cache-busting header to your deployment.

## Cloudflare Cache Settings

For future deployments, consider:

1. **Browser Cache TTL**: 4 hours (reasonable for most apps)
2. **Edge Cache TTL**: Default
3. **Development Mode**: Enable during testing (bypasses cache for 3 hours)

To enable Development Mode:
1. Cloudflare Dashboard > **Caching**
2. Toggle **Development Mode** ON
3. Test your changes
4. Toggle OFF when done

## After Purging

Once cache is purged:

1. Open fresh incognito window
2. Go to https://tarkov.juanis.cool/login
3. Check DevTools console - should see NO Supabase references
4. Login with Discord
5. Should see Appwrite auth working

