# Bun Build Environment Variables - Critical Learning

## The Problem

When migrating from Vite to Bun, we discovered that environment variable inlining works differently than expected.

### ❌ What Doesn't Work

**Attempt 1: Using `--env` flag**
```bash
bun build index.html --env 'VITE_*'
```
**Result:** Variables are NOT inlined in browser bundles

**Attempt 2: Using `--define` with process.env**
```bash
bun build index.html \
  --define "import.meta.env.VITE_APPWRITE_ENDPOINT=process.env.VITE_APPWRITE_ENDPOINT"
```
**Result:** Throws `ReferenceError: process is not defined` in browser (process doesn't exist in browser!)

### ✅ What Works

**Use Bun.build() API with JSON.stringify()**

Create a `build.ts` script:

```typescript
const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  target: 'browser',
  splitting: true,
  minify: true,
  sourcemap: true,
  define: {
    // Use JSON.stringify to convert env var values to string literals
    'import.meta.env.VITE_APPWRITE_ENDPOINT': JSON.stringify(process.env.VITE_APPWRITE_ENDPOINT || ''),
    'import.meta.env.VITE_APPWRITE_PROJECT_ID': JSON.stringify(process.env.VITE_APPWRITE_PROJECT_ID || ''),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '/api'),
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false',
    'import.meta.env.MODE': JSON.stringify('production'),
  },
});
```

## Why JSON.stringify()?

`JSON.stringify()` converts the value to a **string literal** that can be safely embedded in JavaScript:

```javascript
// Input code:
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;

// With JSON.stringify(process.env.VITE_APPWRITE_ENDPOINT):
const endpoint = "https://cloud.appwrite.io/v1";  // ✅ String literal works in browser

// Without JSON.stringify (using process.env directly):
const endpoint = process.env.VITE_APPWRITE_ENDPOINT;  // ❌ process doesn't exist in browser
```

## Usage

```bash
# Set environment variables
export VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
export VITE_APPWRITE_PROJECT_ID="your-project-id"
export VITE_API_URL="/api"

# Run build script
bun run build.ts

# Or use in package.json
"scripts": {
  "build": "bun run build.ts"
}
```

## Verification

To verify env vars were inlined correctly:

```bash
# Should find the actual string value
grep '"https://cloud.appwrite.io/v1"' dist/index-*.js

# Should NOT find import.meta.env references
grep 'import.meta.env.VITE_APPWRITE_ENDPOINT' dist/index-*.js
# (returns nothing = success)

# Should NOT find process.env references
grep 'process\.env' dist/index-*.js
# (returns nothing = success)
```

## Docker Integration

In Dockerfile:

```dockerfile
# Set environment variables from build args
ARG VITE_APPWRITE_ENDPOINT
ARG VITE_APPWRITE_PROJECT_ID
ARG VITE_API_URL
ENV VITE_APPWRITE_ENDPOINT=${VITE_APPWRITE_ENDPOINT}
ENV VITE_APPWRITE_PROJECT_ID=${VITE_APPWRITE_PROJECT_ID}
ENV VITE_API_URL=${VITE_API_URL}

# Run build script (uses process.env which is set from ENV above)
RUN bun run build.ts
```

## Key Takeaway

For **browser-targeted** builds, always use `JSON.stringify()` with `--define` or use the Bun.build() API with the define object to convert environment variables to string literals!

