import React, { useEffect } from 'react';
import { startSpan } from '../../lib/sentry';

/**
 * Web Vitals Monitor Component
 * 
 * Monitors Core Web Vitals and sends them to Sentry for performance analysis.
 * This component should be included in your app to track user experience metrics.
 */
export function WebVitalsMonitor() {
  useEffect(() => {
    // Import web-vitals dynamically to avoid bundle size impact
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Cumulative Layout Shift (CLS)
      getCLS((metric) => {
        startSpan(
          {
            op: 'web.vitals',
            name: 'Cumulative Layout Shift'
          },
          (span) => {
            span?.setAttribute('metric.name', 'CLS');
            span?.setAttribute('metric.value', metric.value);
            span?.setAttribute('metric.rating', metric.rating);
            span?.setAttribute('metric.delta', metric.delta);
            span?.setAttribute('metric.id', metric.id);
            span?.setAttribute('metric.navigationType', metric.navigationType);
          }
        );
      });

      // First Input Delay (FID)
      getFID((metric) => {
        startSpan(
          {
            op: 'web.vitals',
            name: 'First Input Delay'
          },
          (span) => {
            span?.setAttribute('metric.name', 'FID');
            span?.setAttribute('metric.value', metric.value);
            span?.setAttribute('metric.rating', metric.rating);
            span?.setAttribute('metric.delta', metric.delta);
            span?.setAttribute('metric.id', metric.id);
            span?.setAttribute('metric.navigationType', metric.navigationType);
          }
        );
      });

      // First Contentful Paint (FCP)
      getFCP((metric) => {
        startSpan(
          {
            op: 'web.vitals',
            name: 'First Contentful Paint'
          },
          (span) => {
            span?.setAttribute('metric.name', 'FCP');
            span?.setAttribute('metric.value', metric.value);
            span?.setAttribute('metric.rating', metric.rating);
            span?.setAttribute('metric.delta', metric.delta);
            span?.setAttribute('metric.id', metric.id);
            span?.setAttribute('metric.navigationType', metric.navigationType);
          }
        );
      });

      // Largest Contentful Paint (LCP)
      getLCP((metric) => {
        startSpan(
          {
            op: 'web.vitals',
            name: 'Largest Contentful Paint'
          },
          (span) => {
            span?.setAttribute('metric.name', 'LCP');
            span?.setAttribute('metric.value', metric.value);
            span?.setAttribute('metric.rating', metric.rating);
            span?.setAttribute('metric.delta', metric.delta);
            span?.setAttribute('metric.id', metric.id);
            span?.setAttribute('metric.navigationType', metric.navigationType);
            
            // Additional LCP-specific attributes
            if (metric.entries && metric.entries.length > 0) {
              const entry = metric.entries[metric.entries.length - 1];
              span?.setAttribute('metric.element', entry.element?.tagName || 'unknown');
              span?.setAttribute('metric.url', entry.url || '');
            }
          }
        );
      });

      // Time to First Byte (TTFB)
      getTTFB((metric) => {
        startSpan(
          {
            op: 'web.vitals',
            name: 'Time to First Byte'
          },
          (span) => {
            span?.setAttribute('metric.name', 'TTFB');
            span?.setAttribute('metric.value', metric.value);
            span?.setAttribute('metric.rating', metric.rating);
            span?.setAttribute('metric.delta', metric.delta);
            span?.setAttribute('metric.id', metric.id);
            span?.setAttribute('metric.navigationType', metric.navigationType);
          }
        );
      });
    }).catch((error) => {
      console.warn('Failed to load web-vitals:', error);
    });
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for manual Web Vitals reporting
 * Use this when you need to report custom metrics
 */
export function useWebVitals() {
  const reportCustomMetric = (name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor' = 'good') => {
    startSpan(
      {
        op: 'web.vitals.custom',
        name: `Custom Metric: ${name}`
      },
      (span) => {
        span?.setAttribute('metric.name', name);
        span?.setAttribute('metric.value', value);
        span?.setAttribute('metric.rating', rating);
        span?.setAttribute('metric.type', 'custom');
      }
    );
  };

  return { reportCustomMetric };
}
