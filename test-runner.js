#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates all testing suites across the project
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Test configuration
const testSuites = {
  backend: {
    path: 'packages/backend',
    suites: {
      unit: 'test',
      integration: 'test:integration',
      performance: 'test:performance',
      fairness: 'test:fairness',
      'game-engine': 'test:game-engine',
      api: 'test:api',
      database: 'test:database',
      currency: 'test:currency',
      statistics: 'test:statistics',
      all: 'test:coverage'
    }
  },
  frontend: {
    path: 'packages/frontend',
    suites: {
      unit: 'test:unit',
      integration: 'test:integration',
      e2e: 'test:e2e',
      components: 'test:components',
      hooks: 'test:hooks',
      auth: 'test:auth',
      games: 'test:games',
      ui: 'test:ui',
      all: 'test:coverage'
    }
  }
}

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan')
  log(`  ${message}`, 'bright')
  log('='.repeat(60), 'cyan')
}

function logSubHeader(message) {
  log(`\n${'-'.repeat(40)}`, 'blue')
  log(`  ${message}`, 'blue')
  log('-'.repeat(40), 'blue')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Execute command in specific directory
function runCommand(command, cwd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

// Check if directory exists
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch (error) {
    return false
  }
}

// Run specific test suite
async function runTestSuite(package, suite) {
  const config = testSuites[package]
  if (!config) {
    throw new Error(`Unknown package: ${package}`)
  }

  const command = config.suites[suite]
  if (!command) {
    throw new Error(`Unknown test suite: ${suite} for package: ${package}`)
  }

  const cwd = path.resolve(config.path)
  if (!directoryExists(cwd)) {
    throw new Error(`Directory does not exist: ${cwd}`)
  }

  logSubHeader(`Running ${package} ${suite} tests`)
  
  try {
    await runCommand('bun', cwd, ['run', command])
    logSuccess(`${package} ${suite} tests passed`)
    return true
  } catch (error) {
    logError(`${package} ${suite} tests failed: ${error.message}`)
    return false
  }
}

// Run all tests for a package
async function runPackageTests(package) {
  const config = testSuites[package]
  const results = {}
  
  logHeader(`Running all ${package} tests`)
  
  for (const [suite, command] of Object.entries(config.suites)) {
    if (suite === 'all') continue // Skip 'all' suite to avoid duplication
    
    try {
      const success = await runTestSuite(package, suite)
      results[suite] = success
    } catch (error) {
      results[suite] = false
      logError(`Failed to run ${suite}: ${error.message}`)
    }
  }
  
  return results
}

// Run all tests across all packages
async function runAllTests() {
  logHeader('Running comprehensive test suite')
  
  const allResults = {}
  
  for (const package of Object.keys(testSuites)) {
    try {
      const results = await runPackageTests(package)
      allResults[package] = results
    } catch (error) {
      logError(`Failed to run ${package} tests: ${error.message}`)
      allResults[package] = { error: error.message }
    }
  }
  
  return allResults
}

// Generate test report
function generateReport(results) {
  logHeader('Test Results Summary')
  
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  
  for (const [package, packageResults] of Object.entries(results)) {
    logSubHeader(`${package.toUpperCase()} Results`)
    
    if (packageResults.error) {
      logError(`Package failed: ${packageResults.error}`)
      continue
    }
    
    for (const [suite, success] of Object.entries(packageResults)) {
      totalTests++
      if (success) {
        passedTests++
        logSuccess(`${suite}: PASSED`)
      } else {
        failedTests++
        logError(`${suite}: FAILED`)
      }
    }
  }
  
  logHeader('Overall Summary')
  log(`Total test suites: ${totalTests}`)
  logSuccess(`Passed: ${passedTests}`)
  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`)
  }
  
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0
  log(`Success rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow')
  
  return failedTests === 0
}

// Performance benchmark runner
async function runPerformanceBenchmarks() {
  logHeader('Running Performance Benchmarks')
  
  try {
    await runTestSuite('backend', 'performance')
    logSuccess('Performance benchmarks completed')
  } catch (error) {
    logError(`Performance benchmarks failed: ${error.message}`)
  }
}

// Game fairness validation
async function runFairnessTests() {
  logHeader('Running Game Fairness Tests')
  
  try {
    await runTestSuite('backend', 'fairness')
    logSuccess('Game fairness tests completed')
  } catch (error) {
    logError(`Game fairness tests failed: ${error.message}`)
  }
}

// CI/CD specific test runner
async function runCITests() {
  logHeader('Running CI/CD Test Suite')
  
  const results = {}
  
  // Run backend CI tests
  try {
    await runCommand('bun', path.resolve('packages/backend'), ['run', 'test:ci'])
    results.backend = true
    logSuccess('Backend CI tests passed')
  } catch (error) {
    results.backend = false
    logError(`Backend CI tests failed: ${error.message}`)
  }
  
  // Run frontend CI tests
  try {
    await runCommand('bun', path.resolve('packages/frontend'), ['run', 'test:ci'])
    results.frontend = true
    logSuccess('Frontend CI tests passed')
  } catch (error) {
    results.frontend = false
    logError(`Frontend CI tests failed: ${error.message}`)
  }
  
  return results.backend && results.frontend
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const package = args[1]
  const suite = args[2]
  
  try {
    switch (command) {
      case 'run':
        if (package && suite) {
          await runTestSuite(package, suite)
        } else if (package) {
          await runPackageTests(package)
        } else {
          const results = await runAllTests()
          const success = generateReport(results)
          process.exit(success ? 0 : 1)
        }
        break
        
      case 'performance':
        await runPerformanceBenchmarks()
        break
        
      case 'fairness':
        await runFairnessTests()
        break
        
      case 'ci':
        const success = await runCITests()
        process.exit(success ? 0 : 1)
        break
        
      case 'help':
      default:
        log('Tarkov Casino Test Runner', 'bright')
        log('\nUsage:')
        log('  node test-runner.js [command] [package] [suite]')
        log('\nCommands:')
        log('  run [package] [suite]  - Run specific test suite')
        log('  run [package]          - Run all tests for package')
        log('  run                    - Run all tests')
        log('  performance            - Run performance benchmarks')
        log('  fairness               - Run game fairness tests')
        log('  ci                     - Run CI/CD test suite')
        log('  help                   - Show this help')
        log('\nPackages:')
        log('  backend, frontend')
        log('\nBackend test suites:')
        log('  unit, integration, performance, fairness, game-engine, api, database, currency, statistics')
        log('\nFrontend test suites:')
        log('  unit, integration, e2e, components, hooks, auth, games, ui')
        log('\nExamples:')
        log('  node test-runner.js run backend unit')
        log('  node test-runner.js run frontend')
        log('  node test-runner.js run')
        log('  node test-runner.js performance')
        break
    }
  } catch (error) {
    logError(`Test runner failed: ${error.message}`)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

// Run main function
if (require.main === module) {
  main()
}

module.exports = {
  runTestSuite,
  runPackageTests,
  runAllTests,
  generateReport,
  runPerformanceBenchmarks,
  runFairnessTests,
  runCITests
}