#!/usr/bin/env bun
/**
 * Performance benchmark script for Bun 1.3
 * Tests various performance metrics of the application
 */

interface BenchmarkResult {
  name: string
  duration: number
  opsPerSec?: number
  success: boolean
  error?: string
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(num))
}

async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  try {
    // Warm up
    await fn()
    
    // Benchmark
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await fn()
    }
    const duration = performance.now() - start
    const avgDuration = duration / iterations
    const opsPerSec = 1000 / avgDuration
    
    return {
      name,
      duration: avgDuration,
      opsPerSec,
      success: true,
    }
  } catch (error) {
    return {
      name,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function benchmarkAPI(url: string, name: string): Promise<BenchmarkResult> {
  const iterations = 100
  const timeout = 5000 // 5 second timeout
  
  try {
    // Test if server is reachable first
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      throw new Error(`Server not reachable: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    const start = performance.now()
    let successCount = 0
    
    for (let i = 0; i < iterations; i++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (response.ok) successCount++
      } catch {
        clearTimeout(timeoutId)
        // Count as failed request, continue
      }
    }
    
    const duration = performance.now() - start
    const avgDuration = duration / iterations
    const opsPerSec = 1000 / avgDuration
    
    return {
      name: `${name} (${successCount}/${iterations} success)`,
      duration: avgDuration,
      opsPerSec,
      success: successCount > 0, // Success if at least some requests worked
    }
  } catch (error) {
    return {
      name,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('🏃 Running Performance Benchmarks...\n')
  
  const results: BenchmarkResult[] = []
  
  // 1. JSON Parsing
  console.log('📊 Testing JSON operations...')
  const largeJSON = JSON.stringify({
    data: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      tags: ['tag1', 'tag2', 'tag3'],
    })),
  })
  
  results.push(
    await benchmark('JSON.parse (1000 items)', () => {
      JSON.parse(largeJSON)
    })
  )
  
  results.push(
    await benchmark('JSON.stringify (1000 items)', () => {
      JSON.stringify(JSON.parse(largeJSON))
    })
  )
  
  // 2. String Operations
  console.log('📝 Testing string operations...')
  results.push(
    await benchmark('String concatenation (1000 ops)', () => {
      let str = ''
      for (let i = 0; i < 1000; i++) {
        str += 'a'
      }
    })
  )
  
  results.push(
    await benchmark('String template literals (1000 ops)', () => {
      let str = ''
      for (let i = 0; i < 1000; i++) {
        str = `${str}a`
      }
    })
  )
  
  // 3. Array Operations
  console.log('📦 Testing array operations...')
  const largeArray = Array.from({ length: 10000 }, (_, i) => i)
  
  results.push(
    await benchmark('Array.map (10000 items)', () => {
      largeArray.map(x => x * 2)
    })
  )
  
  results.push(
    await benchmark('Array.filter (10000 items)', () => {
      largeArray.filter(x => x % 2 === 0)
    })
  )
  
  results.push(
    await benchmark('Array.reduce (10000 items)', () => {
      largeArray.reduce((sum, x) => sum + x, 0)
    })
  )
  
  // 4. Object Operations
  console.log('🗂️  Testing object operations...')
  const largeObject = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`key${i}`, i])
  )
  
  results.push(
    await benchmark('Object.keys (1000 props)', () => {
      Object.keys(largeObject)
    })
  )
  
  results.push(
    await benchmark('Object.values (1000 props)', () => {
      Object.values(largeObject)
    })
  )
  
  results.push(
    await benchmark('Object.entries (1000 props)', () => {
      Object.entries(largeObject)
    })
  )
  
  // 5. Crypto Operations (Bun native)
  console.log('🔐 Testing crypto operations...')
  results.push(
    await benchmark('Crypto.randomUUID', () => {
      crypto.randomUUID()
    })
  )
  
  results.push(
    await benchmark('Bun.CryptoHasher (SHA256)', async () => {
      const hasher = new Bun.CryptoHasher('sha256')
      hasher.update('test data')
      hasher.digest('hex')
    })
  )
  
  // 6. File Operations
  console.log('📁 Testing file operations...')
  const testData = 'Test data '.repeat(1000)
  
  results.push(
    await benchmark('Bun.write (small file)', async () => {
      await Bun.write('/tmp/bench-test.txt', testData)
    })
  )
  
  results.push(
    await benchmark('Bun.file().text()', async () => {
      const file = Bun.file('/tmp/bench-test.txt')
      await file.text()
    })
  )
  
  // 7. API Benchmarks (if server is running)
  // Use PORT environment variable or default to 3000
  const port = process.env.PORT || '3000'
  const host = process.env.HOST || 'localhost'
  const serverUrl = process.env.API_URL || `http://${host}:${port}`
  
  console.log(`\n🌐 Testing API endpoints at ${serverUrl}...`)
  console.log('   (Testing with 5s timeout per request)')
  console.log(`   Using PORT=${port}, HOST=${host}`)
  console.log('   If server is not running, these tests will be skipped')
  console.log('')
  
  results.push(await benchmarkAPI(`${serverUrl}/api/health`, 'Health Check'))
  results.push(await benchmarkAPI(`${serverUrl}/api/statistics/leaderboard`, 'Leaderboard API'))
  
  // Print Results
  console.log('\n' + '='.repeat(80))
  console.log('📊 Benchmark Results')
  console.log('='.repeat(80))
  console.log('')
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}`)
      console.log(`   Duration: ${result.duration.toFixed(3)}ms`)
      if (result.opsPerSec) {
        console.log(`   Throughput: ${formatNumber(result.opsPerSec)} ops/sec`)
      }
    } else {
      console.log(`❌ ${result.name}`)
      console.log(`   Error: ${result.error}`)
    }
    console.log('')
  })
  
  // Summary
  const successfulBenchmarks = results.filter(r => r.success)
  const avgDuration = successfulBenchmarks.reduce((sum, r) => sum + r.duration, 0) / successfulBenchmarks.length
  
  console.log('='.repeat(80))
  console.log('📈 Summary')
  console.log('='.repeat(80))
  console.log(`Total Benchmarks: ${results.length}`)
  console.log(`Successful: ${successfulBenchmarks.length}`)
  console.log(`Failed: ${results.length - successfulBenchmarks.length}`)
  console.log(`Average Duration: ${avgDuration.toFixed(3)}ms`)
  console.log('')
  
  // Performance Tips
  console.log('💡 Performance Tips:')
  console.log('━'.repeat(80))
  console.log('1. Use Bun.file() instead of fs.readFile for better performance')
  console.log('2. Use Bun.CryptoHasher for hashing operations')
  console.log('3. Use native Bun.password for password hashing')
  console.log('4. Enable code splitting in production builds')
  console.log('5. Use Cache-Control headers for static assets')
  console.log('6. Monitor slow API endpoints (>1000ms)')
  console.log('')
  
  // Cleanup
  try {
    await Bun.write('/tmp/bench-test.txt', '')
  } catch {
    // Ignore cleanup errors
  }
  
  console.log('✨ Benchmarks complete!')
  
  // Exit with error code if any benchmark failed
  if (results.some(r => !r.success)) {
    process.exit(1)
  }
}

main().catch(console.error)

