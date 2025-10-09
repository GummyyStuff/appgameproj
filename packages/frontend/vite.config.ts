import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  // Load environment variables based on mode
  envDir: '.',
  envPrefix: 'VITE_',
  // Explicitly set public directory
  publicDir: 'public',
  // Set base URL for production
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure public directory files are copied
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React ecosystem together to avoid import issues
          'react-vendor': ['react', 'react-dom'],
          // Separate other large dependencies
          'router-vendor': ['react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'appwrite-vendor': ['appwrite'],
          'animation-vendor': ['framer-motion'],
          'chart-vendor': ['recharts'],
          'socket-vendor': ['socket.io-client']
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Optimize bundle size
    minify: 'esbuild', // Changed from terser to esbuild for better compatibility
    // Set chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'appwrite',
      'framer-motion',
      'recharts',
      'socket.io-client'
    ],
  },
}))