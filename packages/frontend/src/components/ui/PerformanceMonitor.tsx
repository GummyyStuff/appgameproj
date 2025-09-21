import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { performanceMonitor } from '@/utils/performance';
import { errorTracker } from '@/utils/error-tracking';
import { TarkovCard } from './TarkovCard';

interface PerformanceMonitorProps {
  isVisible: boolean;
  onClose: () => void;
}

export function PerformanceMonitor({ isVisible, onClose }: PerformanceMonitorProps) {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [errorData, setErrorData] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      const updateData = () => {
        setPerformanceData(performanceMonitor.getPerformanceSummary());
        setErrorData(errorTracker.getErrorSummary());
      };

      updateData();
      const interval = setInterval(updateData, 1000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible || !performanceData) return null;

  const formatTime = (ms: number) => `${ms.toFixed(1)}ms`;
  const formatBytes = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-4 z-50 max-w-sm"
    >
      <TarkovCard className="p-4 bg-black bg-opacity-90 text-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-tarkov-text">Performance Monitor</h3>
          <button
            onClick={onClose}
            className="text-tarkov-text-secondary hover:text-tarkov-text"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Memory Usage */}
          {performanceData.memoryUsage && (
            <div>
              <h4 className="font-semibold text-tarkov-text mb-1">Memory</h4>
              <div className="text-tarkov-text-secondary space-y-1">
                <div>Used: {formatBytes(performanceData.memoryUsage.usedJSHeapSize)}</div>
                <div>Total: {formatBytes(performanceData.memoryUsage.totalJSHeapSize)}</div>
                <div>Limit: {formatBytes(performanceData.memoryUsage.jsHeapSizeLimit)}</div>
              </div>
            </div>
          )}

          {/* Recent Metrics */}
          <div>
            <h4 className="font-semibold text-tarkov-text mb-1">Recent Metrics</h4>
            <div className="text-tarkov-text-secondary space-y-1">
              {performanceData.metrics.slice(-5).map((metric: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate mr-2">{metric.name}</span>
                  <span>{formatTime(metric.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Game Performance */}
          {performanceData.gameMetrics.size > 0 && (
            <div>
              <h4 className="font-semibold text-tarkov-text mb-1">Game Performance</h4>
              <div className="text-tarkov-text-secondary space-y-1">
                {Array.from(performanceData.gameMetrics.entries()).map(([game, data]: [string, any]) => (
                  <div key={game}>
                    <div className="font-medium">{game}</div>
                    <div className="ml-2 space-y-1">
                      <div>Load: {formatTime(data.loadTime)}</div>
                      <div>Render: {formatTime(data.renderTime)}</div>
                      <div>Interaction: {formatTime(data.interactionDelay)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Summary */}
          {errorData && errorData.totalErrors > 0 && (
            <div>
              <h4 className="font-semibold text-red-400 mb-1">
                Errors ({errorData.totalErrors})
              </h4>
              <div className="text-tarkov-text-secondary space-y-1">
                {Object.entries(errorData.errorsBySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between">
                    <span className="capitalize">{severity}</span>
                    <span className={severity === 'critical' ? 'text-red-400' : ''}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-tarkov-border">
            <button
              onClick={() => {
                performanceMonitor.clearMetrics();
                errorTracker.clear();
              }}
              className="text-xs px-2 py-1 bg-tarkov-surface border border-tarkov-border rounded hover:bg-tarkov-accent transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const data = {
                  performance: performanceMonitor.exportMetrics(),
                  errors: errorTracker.exportErrors(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-report-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs px-2 py-1 bg-tarkov-surface border border-tarkov-border rounded hover:bg-tarkov-accent transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </TarkovCard>
    </motion.div>
  );
}

/**
 * Performance monitor toggle button (for development)
 */
export function PerformanceToggle() {
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 bg-gray-800 text-white p-2 rounded text-xs z-40 opacity-50 hover:opacity-100 transition-opacity"
        title="Toggle Performance Monitor"
      >
        📊
      </button>

      <PerformanceMonitor isVisible={isVisible} onClose={() => setIsVisible(false)} />
    </>
  );
}