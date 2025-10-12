#!/usr/bin/env bun
/**
 * Bundle analysis script for Bun 1.3
 * Analyzes the built frontend bundle and provides size insights
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

interface FileInfo {
  path: string
  size: number
  type: 'js' | 'css' | 'html' | 'map' | 'other'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function getFileType(filename: string): FileInfo['type'] {
  if (filename.endsWith('.js')) return 'js'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.html')) return 'html'
  if (filename.endsWith('.map')) return 'map'
  return 'other'
}

async function analyzeDirectory(dir: string): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const subFiles = await analyzeDirectory(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        const stats = await stat(fullPath)
        files.push({
          path: fullPath,
          size: stats.size,
          type: getFileType(entry.name),
        })
      }
    }
  } catch (error) {
    console.error(`Error analyzing directory ${dir}:`, error)
  }
  
  return files
}

async function main() {
  console.log('📊 Analyzing bundle sizes...\n')
  
  const distPath = join(process.cwd(), 'packages/frontend/dist')
  const files = await analyzeDirectory(distPath)
  
  if (files.length === 0) {
    console.error('❌ No files found in dist directory. Run `bun run build:frontend` first.')
    process.exit(1)
  }
  
  // Group by type
  const byType: Record<string, FileInfo[]> = {
    js: [],
    css: [],
    html: [],
    map: [],
    other: [],
  }
  
  files.forEach(file => {
    byType[file.type].push(file)
  })
  
  // Calculate totals
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const jsSize = byType.js.reduce((sum, file) => sum + file.size, 0)
  const cssSize = byType.css.reduce((sum, file) => sum + file.size, 0)
  const mapSize = byType.map.reduce((sum, file) => sum + file.size, 0)
  
  // Main bundle size (excluding sourcemaps)
  const mainBundleSize = totalSize - mapSize
  
  console.log('📦 Bundle Analysis Results')
  console.log('━'.repeat(60))
  console.log('')
  
  console.log('Total Bundle Size (excluding maps):', formatBytes(mainBundleSize))
  console.log('  JavaScript:', formatBytes(jsSize), `(${((jsSize / mainBundleSize) * 100).toFixed(1)}%)`)
  console.log('  CSS:', formatBytes(cssSize), `(${((cssSize / mainBundleSize) * 100).toFixed(1)}%)`)
  console.log('  Other:', formatBytes(mainBundleSize - jsSize - cssSize))
  console.log('')
  console.log('Sourcemaps:', formatBytes(mapSize))
  console.log('Total (including maps):', formatBytes(totalSize))
  console.log('')
  
  // Show largest files
  console.log('🔝 Largest Files:')
  console.log('━'.repeat(60))
  
  const sortedFiles = files
    .filter(f => f.type !== 'map')
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
  
  sortedFiles.forEach((file, i) => {
    const relativePath = file.path.replace(distPath + '/', '')
    console.log(`${i + 1}. ${relativePath}`)
    console.log(`   ${formatBytes(file.size)} (${file.type.toUpperCase()})`)
  })
  
  console.log('')
  
  // File count by type
  console.log('📁 File Counts:')
  console.log('━'.repeat(60))
  console.log(`JavaScript: ${byType.js.length} files`)
  console.log(`CSS: ${byType.css.length} files`)
  console.log(`HTML: ${byType.html.length} files`)
  console.log(`Sourcemaps: ${byType.map.length} files`)
  console.log(`Other: ${byType.other.length} files`)
  console.log(`Total: ${files.length} files`)
  console.log('')
  
  // Performance recommendations
  console.log('💡 Recommendations:')
  console.log('━'.repeat(60))
  
  if (jsSize > 500 * 1024) {
    console.log('⚠️  JavaScript bundle is large (>500KB)')
    console.log('   Consider: code splitting, tree shaking, or lazy loading')
  }
  
  if (cssSize > 100 * 1024) {
    console.log('⚠️  CSS bundle is large (>100KB)')
    console.log('   Consider: removing unused styles or splitting CSS')
  }
  
  if (byType.js.length === 1 && jsSize > 200 * 1024) {
    console.log('⚠️  Single JavaScript file detected')
    console.log('   Enable code splitting for better caching')
  }
  
  if (byType.map.length === 0) {
    console.log('ℹ️  No sourcemaps found (good for production)')
  }
  
  if (mainBundleSize < 300 * 1024) {
    console.log('✅ Bundle size is excellent!')
  } else if (mainBundleSize < 500 * 1024) {
    console.log('✅ Bundle size is good!')
  }
  
  console.log('')
  console.log('✨ Analysis complete!')
}

main().catch(console.error)

