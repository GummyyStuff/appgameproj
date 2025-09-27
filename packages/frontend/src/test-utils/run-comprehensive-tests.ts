/**
 * Comprehensive Test Runner for Chat System
 * Runs all performance, load, and e2e tests with reporting
 */

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

interface TestResult {
  testFile: string
  testName: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  metrics?: {
    memoryUsage?: number
    messageCount?: number
    latency?: number
    throughput?: number
  }
}

interface TestSuite {
  name: string
  description: string
  testFiles: string[]
  timeout: number
}

class ComprehensiveTestRunner {
  private results: TestResult[] = []
  private startTime: number = 0
  private reportDir: string

  constructor() {
    this.reportDir = join(process.cwd(), 'test-reports')
    this.ensureReportDir()
  }

  /**
   * Run all comprehensive tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Chat System Tests')
    console.log('=' .repeat(60))
    
    this.startTime = Date.now()

    const testSuites: TestSuite[] = [
      {
        name: 'Unit Tests',
        description: 'Individual component and service tests',
        testFiles: [
          'src/components/chat/__tests__/*.test.tsx',
          'src/services/__tests__/*.test.ts',
          'src/hooks/__tests__/*.test.ts',
          'src/utils/__tests__/*.test.ts'
        ],
        timeout: 30000
      },
      {
        name: 'Integration Tests',
        description: 'Component integration and service interaction tests',
        testFiles: [
          'src/test-utils/integration-verification.test.ts',
          'src/test-utils/simple-integration.test.tsx',
          'src/test-utils/chat-integration.test.tsx'
        ],
        timeout: 60000
      },
      {
        name: 'End-to-End Tests',
        description: 'Multi-user chat scenarios and real-time delivery',
        testFiles: [
          'src/test-utils/chat-e2e.test.ts'
        ],
        timeout: 120000
      },
      {
        name: 'Performance Tests',
        description: 'Performance monitoring and optimization tests',
        testFiles: [
          'src/test-utils/chat-performance.test.ts'
        ],
        timeout: 90000
      },
      {
        name: 'Load Tests',
        description: 'High concurrency and message volume tests',
        testFiles: [
          'src/test-utils/chat-load.test.ts'
        ],
        timeout: 180000
      }
    ]

    for (const suite of testSuites) {
      await this.runTestSuite(suite)
    }

    this.generateReport()
    this.printSummary()
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n📋 Running ${suite.name}`)
    console.log(`   ${suite.description}`)
    console.log('-'.repeat(40))

    for (const testFile of suite.testFiles) {
      await this.runTestFile(testFile, suite.timeout)
    }
  }

  /**
   * Run tests in a specific file
   */
  private async runTestFile(testFile: string, timeout: number): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`  🧪 ${testFile}`)
      
      // Run the test file with bun test
      const command = `bun test ${testFile} --timeout ${timeout}`
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: timeout + 10000 // Add buffer to command timeout
      })

      const duration = Date.now() - startTime
      
      // Parse test results from output
      const testResults = this.parseTestOutput(output, testFile, duration)
      this.results.push(...testResults)
      
      console.log(`    ✅ Completed in ${duration}ms`)
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.results.push({
        testFile,
        testName: 'Test Suite',
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      console.log(`    ❌ Failed in ${duration}ms`)
      console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Parse test output to extract individual test results
   */
  private parseTestOutput(output: string, testFile: string, duration: number): TestResult[] {
    const results: TestResult[] = []
    
    // Simple parsing - in a real implementation, you'd parse the actual test output format
    const lines = output.split('\n')
    let currentTest = ''
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('✗')) {
        const testName = line.replace(/[✓✗]/g, '').trim()
        const status = line.includes('✓') ? 'passed' : 'failed'
        
        results.push({
          testFile,
          testName,
          status,
          duration: duration / Math.max(results.length + 1, 1), // Estimate per test
          error: status === 'failed' ? 'Test failed' : undefined
        })
      }
    }
    
    // If no individual tests found, create a single result for the file
    if (results.length === 0) {
      results.push({
        testFile,
        testName: 'Test Suite',
        status: 'passed',
        duration
      })
    }
    
    return results
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.status === 'passed').length
    const failedTests = this.results.filter(r => r.status === 'failed').length
    const totalTests = this.results.length

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        totalDuration,
        timestamp: new Date().toISOString()
      },
      testResults: this.results,
      performance: this.generatePerformanceReport(),
      recommendations: this.generateRecommendations()
    }

    // Write JSON report
    const jsonReportPath = join(this.reportDir, 'comprehensive-test-report.json')
    writeFileSync(jsonReportPath, JSON.stringify(report, null, 2))

    // Write HTML report
    const htmlReportPath = join(this.reportDir, 'comprehensive-test-report.html')
    writeFileSync(htmlReportPath, this.generateHtmlReport(report))

    console.log(`\n📊 Reports generated:`)
    console.log(`   JSON: ${jsonReportPath}`)
    console.log(`   HTML: ${htmlReportPath}`)
  }

  /**
   * Generate performance analysis
   */
  private generatePerformanceReport(): any {
    const performanceTests = this.results.filter(r => 
      r.testFile.includes('performance') || r.testFile.includes('load')
    )

    const avgDuration = performanceTests.length > 0 
      ? performanceTests.reduce((sum, test) => sum + test.duration, 0) / performanceTests.length
      : 0

    return {
      averageTestDuration: avgDuration,
      slowestTest: performanceTests.reduce((slowest, test) => 
        test.duration > slowest.duration ? test : slowest, 
        { duration: 0, testName: 'None' }
      ),
      fastestTest: performanceTests.reduce((fastest, test) => 
        test.duration < fastest.duration ? test : fastest, 
        { duration: Infinity, testName: 'None' }
      ),
      performanceTestCount: performanceTests.length
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    const failedTests = this.results.filter(r => r.status === 'failed')
    const slowTests = this.results.filter(r => r.duration > 5000) // Tests taking more than 5 seconds

    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failing tests to improve system reliability`)
    }

    if (slowTests.length > 0) {
      recommendations.push(`Optimize ${slowTests.length} slow tests for better performance`)
    }

    const loadTests = this.results.filter(r => r.testFile.includes('load'))
    const failedLoadTests = loadTests.filter(r => r.status === 'failed')
    
    if (failedLoadTests.length > 0) {
      recommendations.push('Load tests failing - consider scaling improvements')
    }

    const e2eTests = this.results.filter(r => r.testFile.includes('e2e'))
    const failedE2eTests = e2eTests.filter(r => r.status === 'failed')
    
    if (failedE2eTests.length > 0) {
      recommendations.push('E2E tests failing - check real-time functionality')
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passing - system is performing well!')
    }

    return recommendations
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat System Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .test-results { margin-top: 30px; }
        .test-item { padding: 10px; border-left: 4px solid #ddd; margin-bottom: 10px; background: #f8f9fa; }
        .test-item.passed { border-left-color: #28a745; }
        .test-item.failed { border-left-color: #dc3545; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 6px; margin-top: 30px; }
        .recommendations h3 { color: #0066cc; margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Chat System Comprehensive Test Report</h1>
            <p>Generated on ${new Date(report.summary.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${report.summary.successRate >= 90 ? 'success' : report.summary.successRate >= 70 ? 'warning' : 'danger'}">
                    ${report.summary.successRate.toFixed(1)}%
                </div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${report.summary.passedTests}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value danger">${report.summary.failedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.summary.totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Results</h2>
            ${report.testResults.map((test: TestResult) => `
                <div class="test-item ${test.status}">
                    <strong>${test.testName}</strong>
                    <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                        ${test.testFile} - ${test.duration}ms
                        ${test.error ? `<br><span style="color: #dc3545;">Error: ${test.error}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>📋 Recommendations</h3>
            <ul>
                ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
            <p>Performance Analysis: Average test duration ${report.performance.averageTestDuration.toFixed(0)}ms</p>
            <p>Slowest test: ${report.performance.slowestTest.testName} (${report.performance.slowestTest.duration}ms)</p>
        </div>
    </div>
</body>
</html>
    `
  }

  /**
   * Print test summary to console
   */
  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime
    const passedTests = this.results.filter(r => r.status === 'passed').length
    const failedTests = this.results.filter(r => r.status === 'failed').length
    const totalTests = this.results.length
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

    console.log('\n' + '='.repeat(60))
    console.log('📊 COMPREHENSIVE TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests:    ${totalTests}`)
    console.log(`Passed:         ${passedTests} ✅`)
    console.log(`Failed:         ${failedTests} ${failedTests > 0 ? '❌' : ''}`)
    console.log(`Success Rate:   ${successRate.toFixed(1)}%`)
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log('='.repeat(60))

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.testName} (${test.testFile})`)
          if (test.error) {
            console.log(`     Error: ${test.error}`)
          }
        })
    }

    if (successRate >= 90) {
      console.log('\n🎉 Excellent! Chat system is performing very well.')
    } else if (successRate >= 70) {
      console.log('\n⚠️  Good performance, but some areas need attention.')
    } else {
      console.log('\n🚨 Performance issues detected. Review failed tests.')
    }
  }

  /**
   * Ensure report directory exists
   */
  private ensureReportDir(): void {
    try {
      mkdirSync(this.reportDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const runner = new ComprehensiveTestRunner()
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { ComprehensiveTestRunner }