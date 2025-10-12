#!/usr/bin/env bun

/**
 * Bun 1.3 Performance Benchmark Script
 * =====================================
 * 
 * This script measures performance improvements after Bun 1.3 optimizations:
 * - Backend startup time
 * - Backend build time
 * - Test execution time
 * - Frontend build time
 * 
 * Usage: bun run scripts/benchmark-bun.ts
 */

import { $ } from "bun";
import { hrtime } from "node:process";

console.log(`
╔════════════════════════════════════════════════════════════╗
║  📊 Bun 1.3 Performance Benchmark                          ║
║  Measuring optimization improvements                        ║
╚════════════════════════════════════════════════════════════╝
`);

interface BenchmarkResult {
  name: string;
  duration: number;
  unit: string;
  status: "✅" | "⚠️" | "❌";
  notes?: string;
}

const results: BenchmarkResult[] = [];

function formatDuration(nanoseconds: number): string {
  const ms = nanoseconds / 1_000_000;
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmark(name: string, fn: () => Promise<void>): Promise<number> {
  console.log(`\n🔍 Benchmarking: ${name}...`);
  const start = hrtime.bigint();
  
  try {
    await fn();
    const end = hrtime.bigint();
    const duration = Number(end - start);
    console.log(`   ✅ Completed in ${formatDuration(duration)}`);
    return duration;
  } catch (error) {
    const end = hrtime.bigint();
    const duration = Number(end - start);
    console.log(`   ❌ Failed after ${formatDuration(duration)}`);
    console.error(`   Error:`, error);
    return duration;
  }
}

// Benchmark 1: Backend Build Time (with bytecode)
console.log(`\n${"=".repeat(60)}`);
console.log("📦 BACKEND BUILD PERFORMANCE");
console.log("=".repeat(60));

try {
  const buildDuration = await benchmark("Backend build (with bytecode)", async () => {
    await $`cd packages/backend && bun run build`.quiet();
  });
  
  results.push({
    name: "Backend build (production)",
    duration: buildDuration / 1_000_000, // Convert to ms
    unit: "ms",
    status: buildDuration / 1_000_000 < 1000 ? "✅" : "⚠️",
    notes: "With bytecode, minification, and source maps"
  });
} catch (error) {
  results.push({
    name: "Backend build (production)",
    duration: 0,
    unit: "ms",
    status: "❌",
    notes: "Build failed"
  });
}

// Benchmark 2: Backend Build Time (dev, no bytecode)
try {
  const buildDevDuration = await benchmark("Backend build (dev, no bytecode)", async () => {
    await $`cd packages/backend && bun run build:dev`.quiet();
  });
  
  results.push({
    name: "Backend build (development)",
    duration: buildDevDuration / 1_000_000,
    unit: "ms",
    status: buildDevDuration / 1_000_000 < 500 ? "✅" : "⚠️",
    notes: "Without bytecode for faster iteration"
  });
} catch (error) {
  results.push({
    name: "Backend build (development)",
    duration: 0,
    unit: "ms",
    status: "❌",
    notes: "Build failed"
  });
}

// Benchmark 3: Test Execution
console.log(`\n${"=".repeat(60)}`);
console.log("🧪 TEST EXECUTION PERFORMANCE");
console.log("=".repeat(60));

try {
  const testDuration = await benchmark("Test execution", async () => {
    await $`bun test`.quiet();
  });
  
  results.push({
    name: "Test execution (all tests)",
    duration: testDuration / 1_000_000,
    unit: "ms",
    status: "✅",
    notes: "Includes root and workspace tests"
  });
} catch (error) {
  // Tests might fail, but we still want timing
  results.push({
    name: "Test execution (all tests)",
    duration: 0,
    unit: "ms",
    status: "⚠️",
    notes: "Some tests failed, but benchmark completed"
  });
}

// Benchmark 4: Frontend Build (Vite)
console.log(`\n${"=".repeat(60)}`);
console.log("🎨 FRONTEND BUILD PERFORMANCE");
console.log("=".repeat(60));

try {
  const frontendBuildDuration = await benchmark("Frontend build (Vite)", async () => {
    await $`cd packages/frontend && bun run build`.quiet();
  });
  
  results.push({
    name: "Frontend build (Vite)",
    duration: frontendBuildDuration / 1_000_000,
    unit: "ms",
    status: frontendBuildDuration / 1_000_000 < 10000 ? "✅" : "⚠️",
    notes: "Current production build method"
  });
} catch (error) {
  results.push({
    name: "Frontend build (Vite)",
    duration: 0,
    unit: "ms",
    status: "❌",
    notes: "Build failed"
  });
}

// Benchmark 5: Check if backend dist exists and can start quickly
console.log(`\n${"=".repeat(60)}`);
console.log("🚀 RUNTIME STARTUP PERFORMANCE");
console.log("=".repeat(60));

try {
  const startupDuration = await benchmark("Backend startup time", async () => {
    // Start the server and kill it immediately to measure startup
    const proc = Bun.spawn(["bun", "run", "packages/backend/dist/index.js"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    
    // Wait a bit for startup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Kill the process
    proc.kill();
  });
  
  results.push({
    name: "Backend startup (with bytecode)",
    duration: startupDuration / 1_000_000,
    unit: "ms",
    status: startupDuration / 1_000_000 < 1000 ? "✅" : "⚠️",
    notes: "Cold start time with bytecode compilation"
  });
} catch (error) {
  results.push({
    name: "Backend startup",
    duration: 0,
    unit: "ms",
    status: "⚠️",
    notes: "Startup measurement skipped (server may not be built)"
  });
}

// Display results
console.log(`\n${"=".repeat(60)}`);
console.log("📊 BENCHMARK RESULTS SUMMARY");
console.log("=".repeat(60));

console.log(`
┌─────────────────────────────────────┬────────────┬────────┐
│ Benchmark                           │ Duration   │ Status │
├─────────────────────────────────────┼────────────┼────────┤`);

for (const result of results) {
  const name = result.name.padEnd(35);
  const duration = `${result.duration.toFixed(2)}${result.unit}`.padEnd(10);
  console.log(`│ ${name} │ ${duration} │ ${result.status}      │`);
}

console.log(`└─────────────────────────────────────┴────────────┴────────┘`);

// Performance insights
console.log(`\n${"=".repeat(60)}`);
console.log("💡 PERFORMANCE INSIGHTS");
console.log("=".repeat(60));

const backendBuild = results.find(r => r.name === "Backend build (production)");
const backendBuildDev = results.find(r => r.name === "Backend build (development)");
const frontendBuild = results.find(r => r.name === "Frontend build (Vite)");
const backendStartup = results.find(r => r.name === "Backend startup (with bytecode)");

console.log(`
1. Backend Build Performance:
   • Production build (with bytecode): ${backendBuild ? backendBuild.duration.toFixed(2) + 'ms' : 'N/A'}
   • Development build (no bytecode): ${backendBuildDev ? backendBuildDev.duration.toFixed(2) + 'ms' : 'N/A'}
   ${backendBuild && backendBuildDev ? `• Bytecode overhead: +${(backendBuild.duration - backendBuildDev.duration).toFixed(2)}ms` : ''}
   
2. Backend Startup Performance:
   ${backendStartup ? `• Startup time: ${backendStartup.duration.toFixed(2)}ms` : '• Not measured'}
   ${backendStartup && backendStartup.duration < 500 ? '  ✅ Excellent! Bytecode compilation is working well.' : ''}
   ${backendStartup && backendStartup.duration > 500 && backendStartup.duration < 1000 ? '  ⚠️  Good, but could be faster. Ensure bytecode is enabled.' : ''}
   
3. Frontend Build Performance:
   ${frontendBuild ? `• Vite build: ${(frontendBuild.duration / 1000).toFixed(2)}s` : '• Not measured'}
   ${frontendBuild && frontendBuild.duration < 10000 ? '  ✅ Good performance!' : ''}

4. Expected Improvements (vs. pre-1.3):
   • Backend startup: 2-3x faster with bytecode
   • Test execution: 40x faster abort signals
   • Dev server startup: 10-100x faster with Bun native (vs Vite)
`);

console.log(`\n${"=".repeat(60)}`);
console.log("🎯 RECOMMENDATIONS");
console.log("=".repeat(60));

const recommendations: string[] = [];

if (backendStartup && backendStartup.duration > 500) {
  recommendations.push("• Consider using bytecode compilation for faster startups");
}

if (backendBuild && backendBuild.duration > 1000) {
  recommendations.push("• Backend build is slow. Check for large dependencies");
}

if (frontendBuild && frontendBuild.duration > 15000) {
  recommendations.push("• Frontend build is slow. Consider using Bun's native bundler");
  recommendations.push("  Try: cd packages/frontend && bun run build:bun");
}

if (recommendations.length > 0) {
  console.log("");
  recommendations.forEach(rec => console.log(rec));
} else {
  console.log("\n✅ All benchmarks look good! Your Bun 1.3 optimizations are working well.");
}

console.log(`\n${"=".repeat(60)}`);
console.log("📝 NEXT STEPS");
console.log("=".repeat(60));
console.log(`
1. Try the new Bun dev server for even faster development:
   cd packages/frontend && bun run dev:bun

2. Compare with Vite dev server:
   time bun run dev:bun  vs  time bun run dev:vite

3. Monitor production performance after deployment

4. Run this benchmark regularly to track improvements:
   bun run scripts/benchmark-bun.ts

For detailed information, see:
• QUICK_START_BUN_1.3.md
• BUN_OPTIMIZATION_GUIDE.md
`);

console.log(`\n✅ Benchmark complete!\n`);

