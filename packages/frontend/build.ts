/**
 * Build script for frontend with proper environment variable inlining
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

console.log('🔧 Building with configuration:');
console.log(`   VITE_APPWRITE_ENDPOINT: ${VITE_APPWRITE_ENDPOINT}`);
console.log(`   VITE_APPWRITE_PROJECT_ID: ${VITE_APPWRITE_PROJECT_ID}`);
console.log(`   VITE_API_URL: ${VITE_API_URL}`);
console.log('');

const result = await Bun.build({
  entrypoints: ['./index.html'],
  outdir: './dist',
  target: 'browser',
  splitting: false, // Disabled due to duplicate export bug in Bun 1.3
  minify: !isDev,
  sourcemap: true,
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
  console.error('Build failed:');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`✅ Built ${result.outputs.length} files successfully`);

// Copy public assets
await Bun.$`cp -r public/* dist/`;

console.log('✅ Copied public assets');

