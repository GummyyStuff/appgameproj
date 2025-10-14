# Bun Routing Fix - Static File Serving Issue

## Problem

The website was failing to load with the following error:
```
❌ [NOT FOUND] Static file not found: public/src/main.tsx, Request path: /src/main.tsx
🔄 [FALLBACK] Hit fallback handler for: /src/main.tsx
📄 [SPA] Serving index.html for: /src/main.tsx
```

## Root Cause

The issue was in `/packages/frontend/index.html` line 16:
```html
<link rel="modulepreload" href="/src/main.tsx" />
```

This line was trying to preload the source TypeScript file (`/src/main.tsx`) which doesn't exist in the built output. The build system bundles everything into chunks like `chunk-*.js`, but the HTML still had a reference to the source file.

## Solution

Removed the problematic line from the source HTML:

**Before:**
```html
<!-- Preload critical resources for faster initial load -->
<link rel="modulepreload" href="/src/main.tsx" />
<link rel="preload" href="./public/fa-v5-pro/css/all.min.css" as="style" />
```

**After:**
```html
<!-- Preload critical resources for faster initial load -->
<link rel="preload" href="./public/fa-v5-pro/css/all.min.css" as="style" />
```

## How Bun's Static File Serving Works

According to Bun 1.3 documentation:

### Static Routes
```typescript
Bun.serve({
  routes: {
    // Static route - content is buffered in memory at startup
    "/logo.png": new Response(await Bun.file("./logo.png").bytes()),
  },
});
```

### File Routes
```typescript
Bun.serve({
  routes: {
    // File route - content is read from filesystem on each request
    "/download.zip": new Response(Bun.file("./download.zip")),
  },
});
```

### Our Current Setup

We're using Hono with `serveStatic` middleware:

```typescript
app.use('/*', serveStatic({ 
  root: './public',
  rewriteRequestPath: (path) => {
    const rewritten = path.replace(/^\//, '')
    return rewritten
  },
  onNotFound: (path, c) => {
    console.log(`❌ [NOT FOUND] Static file not found: ${path}`)
  }
}))
```

The `serveStatic` middleware serves files from the `./public` directory. When a file is not found, it falls back to serving `index.html` for SPA routing.

## Build Process

1. **Frontend Build** (`packages/frontend/build.ts`):
   - Bundles TypeScript/TSX files into optimized chunks
   - Outputs to `packages/frontend/dist/`
   - Copies public assets to `dist/`

2. **Copy to Backend**:
   ```bash
   cp -r packages/frontend/dist/* packages/backend/public/
   ```

3. **Backend Serves**:
   - Serves files from `packages/backend/public/`
   - Falls back to `index.html` for SPA routing

## Files Modified

1. `/packages/frontend/index.html` - Removed the modulepreload line

## Verification

After the fix:
- ✅ No more `/src/main.tsx` requests
- ✅ Static files serve correctly
- ✅ SPA routing works properly
- ✅ Stock market page loads without errors

## Testing

To verify the fix works:

1. **Check the built HTML**:
   ```bash
   cat packages/backend/public/index.html | grep modulepreload
   ```
   Should return nothing (no modulepreload lines)

2. **Check the source HTML**:
   ```bash
   cat packages/frontend/index.html | grep modulepreload
   ```
   Should return nothing (no modulepreload lines)

3. **Access the website**:
   - Visit `http://localhost:3000/stock-market`
   - Should load without errors
   - No 404 errors for `/src/main.tsx`

## Best Practices

### For Bun Static File Serving:

1. **Use Built Files**: Always reference built/bundled files, not source files
2. **Remove Source References**: Don't include references to `.tsx`, `.ts`, or other source files in production HTML
3. **Use Relative Paths**: Use relative paths for assets (e.g., `./chunk-*.js` instead of `/chunk-*.js`)
4. **Preload Correctly**: Only preload files that actually exist in the built output

### For SPA Routing:

1. **Fallback to index.html**: All non-asset routes should serve `index.html`
2. **Exclude Static Assets**: Don't serve `index.html` for `.js`, `.css`, `.png`, etc.
3. **Proper MIME Types**: Set correct Content-Type headers for different file types

## References

- [Bun Static File Serving](https://bun.sh/docs/api/http#static-routes)
- [Bun File Routes](https://bun.sh/docs/api/http#file-routes)
- [Bun.serve() Routing](https://bun.sh/docs/api/http#routing)

