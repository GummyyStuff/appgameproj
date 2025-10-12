/**
 * Build script for frontend with Bun 1.3 optimizations
 * 
 * IMPORTANT: Set environment variables before running this script!
 * 
 * Option 1: Create .env file in packages/frontend/ with:
 *   VITE_APPWRITE_ENDPOINT=https://your-appwrite.com/v1
 *   VITE_APPWRITE_PROJECT_ID=your-project-id
 *   VITE_API_URL=/api
 * 
 * Option 2: Export before building:
 *   export VITE_APPWRITE_ENDPOINT="https://your-appwrite.com/v1"
 *   bun run build
 * 
 * Bun 1.3 Optimizations Enabled:
 * ✓ Code splitting for shared dependencies
 * ✓ Granular minification (whitespace, identifiers, syntax)
 * ✓ External sourcemaps for smaller bundles
 * ✓ Drop console/debugger in production
 * ✓ Tree-shaking optimizations
 */

import tailwind from 'bun-plugin-tailwind';

// Load .env file if it exists (Bun automatically loads .env)
const isDev = process.env.NODE_ENV !== 'production';

// Get environment variables (will be inlined as string literals)
const VITE_APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const VITE_APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const VITE_API_URL = process.env.VITE_API_URL || '/api';
const VITE_APPWRITE_DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || '';

// Validate required variables
if (!VITE_APPWRITE_ENDPOINT) {
  console.error('❌ Missing VITE_APPWRITE_ENDPOINT environment variable');
  console.error('Please set it in .env file or export before building');
  process.exit(1);
}

if (!VITE_APPWRITE_PROJECT_ID) {
  console.error('❌ Missing VITE_APPWRITE_PROJECT_ID environment variable');
  console.error('Please set it in .env file or export before building');
  process.exit(1);
}

console.log('🔧 Building with Bun 1.3 optimizations:');
console.log(`   Environment: ${isDev ? 'development' : 'production'}`);
console.log(`   VITE_APPWRITE_ENDPOINT: ${VITE_APPWRITE_ENDPOINT}`);
console.log(`   VITE_APPWRITE_PROJECT_ID: ${VITE_APPWRITE_PROJECT_ID}`);
console.log(`   VITE_API_URL: ${VITE_API_URL}`);
console.log(`   Code Splitting: ${!isDev ? 'enabled' : 'disabled (dev)'}`);
console.log(`   Minification: ${!isDev ? 'full (whitespace + identifiers + syntax)' : 'disabled'}`);
console.log(`   Drop Debug: ${!isDev ? 'console + debugger removed' : 'kept'}`);
console.log('');

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  target: 'browser',
  
  // Enable code splitting for production (Bun 1.3 stable)
  splitting: !isDev,
  
  // Granular minification control
  minify: isDev ? false : {
    whitespace: true,    // Remove unnecessary whitespace
    identifiers: true,   // Shorten variable names
    syntax: true,        // Simplify syntax (e.g., true → !0)
    keepNames: false,    // Don't preserve function/class names (smaller bundles)
  },
  
  // External sourcemaps for smaller main bundles
  sourcemap: isDev ? 'inline' : 'external',
  
  // Drop console logs and debugger statements in production
  drop: isDev ? [] : ['console', 'debugger'],
  
  plugins: [tailwind],
  
  define: {
    // Inline environment variables as string literals
    'import.meta.env.VITE_APPWRITE_ENDPOINT': JSON.stringify(VITE_APPWRITE_ENDPOINT),
    'import.meta.env.VITE_APPWRITE_PROJECT_ID': JSON.stringify(VITE_APPWRITE_PROJECT_ID),
    'import.meta.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
    'import.meta.env.VITE_APPWRITE_DATABASE_ID': JSON.stringify(VITE_APPWRITE_DATABASE_ID),
    'import.meta.env.PROD': isDev ? 'false' : 'true',
    'import.meta.env.DEV': isDev ? 'true' : 'false',
    'import.meta.env.MODE': JSON.stringify(isDev ? 'development' : 'production'),
  },
});

if (!result.success) {
  console.error('❌ Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Calculate build statistics
const totalSize = result.outputs.reduce((acc, output) => {
  try {
    const stat = Bun.file(output.path);
    return acc + stat.size;
  } catch {
    return acc;
  }
}, 0);

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

console.log(`✅ Built ${result.outputs.length} files successfully`);
console.log(`📦 Total bundle size: ${formatBytes(totalSize)}`);

// Log individual file sizes in production
if (!isDev) {
  console.log('\n📄 Output files:');
  for (const output of result.outputs) {
    try {
      const size = Bun.file(output.path).size;
      const relativePath = output.path.replace(process.cwd() + '/packages/frontend/', '');
      console.log(`   ${relativePath}: ${formatBytes(size)}`);
    } catch (error) {
      // Skip files that can't be read
    }
  }
}

// Copy public assets
await Bun.$`cp -r public/* dist/`;

console.log('\n✅ Copied public assets');
console.log('🎉 Build complete!\n');

