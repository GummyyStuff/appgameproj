/**
 * Performance Monitoring Dashboard
 * Real-time display of chat system performance metrics
 */

import React, { useState, useEffect } from 'react'
import { usePerformanceMonitor } from '../../utils/performance-monitor'
import { useMemoryMonitor } from '../../utils/memory-monitor'
import type { PerformanceMetrics } from '../../utils/performance-monitor'
import type { MemoryLeak } from '../../utils/memory-monitor'

interface PerformanceDashboardProps {
  isVisible?: boolean
  onToggle?: () => void
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible = false,
  onToggle
}) => {
  const {
    metrics,
    getLatencyStats,
    getThroughputStats,
    exportMetrics,
    reset
  } = usePerformanceMonitor()

  const {
    memoryUsage,
    leaks,
    trend,
    forceGC,
    runCleanup
  } = useMemoryMonitor()

  const [latencyStats, setLatencyStats] = useState<any>({})
  const [throughputStats, setThroughputStats] = useState<any>({})
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setLatencyStats(getLatencyStats())
        setThroughputStats(getThroughputStats())
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isVisible, getLatencyStats, getThroughputStats])

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Dashboard"
      >
        📊 Perf
      </button>
    )
  }

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            metrics.connectionUptime > 0 ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium">
            Connection: {metrics.connectionUptime > 0 ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {metrics.connectionUptime > 0 && (
          <div className="text-xs text-gray-600">
            Uptime: {formatDuration(metrics.connectionUptime)}
          </div>
        )}
      </div>

      {/* Message Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm font-medium text-gray-700">Messages</div>
          <div className="text-lg font-bold text-blue-600">
            {metrics.messagesSent}
          </div>
          <div className="text-xs text-gray-500">Sent</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm font-medium text-gray-700">Received</div>
          <div className="text-lg font-bold text-green-600">
            {metrics.messagesReceived}
          </div>
          <div className="text-xs text-gray-500">Messages</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Avg Latency:</span>
          <span className={`text-sm font-medium ${
            getStatusColor(metrics.averageLatency, { good: 100, warning: 500 })
          }`}>
            {metrics.averageLatency.toFixed(0)}ms
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Throughput:</span>
          <span className={`text-sm font-medium ${
            getStatusColor(1 / Math.max(metrics.throughput, 0.01), { good: 10, warning: 100 })
          }`}>
            {metrics.throughput.toFixed(2)} msg/s
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Error Rate:</span>
          <span className={`text-sm font-medium ${
            getStatusColor(metrics.errorRate, { good: 1, warning: 5 })
          }`}>
            {metrics.errorRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Memory Usage */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Memory Usage:</span>
          <span className={`text-sm font-medium ${
            getStatusColor(memoryUsage.percentage, { good: 50, warning: 80 })
          }`}>
            {formatBytes(memoryUsage.used)} ({memoryUsage.percentage.toFixed(1)}%)
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              memoryUsage.percentage > 80 ? 'bg-red-500' :
              memoryUsage.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(memoryUsage.percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            Trend: {trend.direction} ({trend.rate.toFixed(1)} MB/min)
          </span>
          <button
            onClick={forceGC}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Force GC
          </button>
        </div>
      </div>

      {/* Memory Leaks */}
      {leaks.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-red-600 mb-2">
            ⚠️ Memory Leaks Detected ({leaks.length})
          </div>
          <div className="max-h-20 overflow-y-auto">
            {leaks.slice(-3).map((leak, index) => (
              <div key={index} className="text-xs text-red-600 mb-1">
                {leak.type}: {leak.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      {showDetails && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Latency Stats</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Min: {latencyStats.min?.toFixed(0) || 0}ms</div>
              <div>Max: {latencyStats.max?.toFixed(0) || 0}ms</div>
              <div>P95: {latencyStats.p95?.toFixed(0) || 0}ms</div>
              <div>P99: {latencyStats.p99?.toFixed(0) || 0}ms</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Throughput</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Last 1min: {throughputStats.last1min?.toFixed(2) || 0} msg/s</div>
              <div>Last 5min: {throughputStats.last5min?.toFixed(2) || 0} msg/s</div>
              <div>Last 15min: {throughputStats.last15min?.toFixed(2) || 0} msg/s</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <button
          onClick={reset}
          className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
        >
          Reset
        </button>
        <button
          onClick={runCleanup}
          className="flex-1 text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
        >
          Cleanup
        </button>
        <button
          onClick={() => {
            const data = exportMetrics()
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `performance-report-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex-1 text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded"
        >
          Export
        </button>
      </div>
    </div>
  )
}

export default PerformanceDashboard