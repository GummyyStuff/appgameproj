import React, { Profiler } from 'react';
import { startSpan } from '../../lib/sentry';

/**
 * Sentry Profiler Component
 * 
 * Wraps components with React's Profiler to track render performance.
 * Automatically sends performance data to Sentry for analysis.
 */

interface SentryProfilerProps {
  children: React.ReactNode;
  name: string;
  component?: string;
  userId?: string;
  gameType?: string;
}

/**
 * Sentry Profiler wrapper component
 * 
 * @example
 * <SentryProfiler name="GameComponent" component="RouletteGame">
 *   <RouletteGame />
 * </SentryProfiler>
 */
export function SentryProfiler({ 
  children, 
  name, 
  component, 
  userId, 
  gameType 
}: SentryProfilerProps) {
  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) => {
    // Only track significant renders to avoid noise
    if (actualDuration < 1) return;

    startSpan(
      {
        op: 'react.profiler',
        name: `React Component: ${name}`
      },
      (span) => {
        // Core performance metrics
        span?.setAttribute('react.component_name', name);
        span?.setAttribute('react.component_type', component || 'unknown');
        span?.setAttribute('react.render_phase', phase);
        span?.setAttribute('react.actual_duration_ms', actualDuration);
        span?.setAttribute('react.base_duration_ms', baseDuration);
        span?.setAttribute('react.start_time_ms', startTime);
        span?.setAttribute('react.commit_time_ms', commitTime);
        
        // Performance analysis
        span?.setAttribute('react.performance_tier',
          actualDuration < 16 ? 'excellent' : // 60fps
          actualDuration < 33 ? 'good' :     // 30fps
          actualDuration < 100 ? 'fair' : 'poor'
        );
        
        // Context information
        if (userId) {
          span?.setAttribute('user.id', userId);
        }
        if (gameType) {
          span?.setAttribute('game.type', gameType);
        }
        
        // Render efficiency
        span?.setAttribute('react.efficiency_ratio', baseDuration > 0 ? actualDuration / baseDuration : 1);
        span?.setAttribute('react.interactions_count', interactions.size);
        
        // Performance warnings
        if (actualDuration > 100) {
          span?.setAttribute('react.slow_render', true);
        }
        if (actualDuration > baseDuration * 2) {
          span?.setAttribute('react.inefficient_render', true);
        }
      }
    );
  };

  return (
    <Profiler id={name} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

/**
 * Higher-order component for wrapping components with Sentry profiling
 * 
 * @example
 * const ProfiledGameComponent = withSentryProfiler(GameComponent, 'GameComponent');
 */
export function withSentryProfiler<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options?: {
    userId?: string;
    gameType?: string;
  }
) {
  const ProfiledComponent = (props: P) => (
    <SentryProfiler 
      name={componentName}
      component={componentName}
      userId={options?.userId}
      gameType={options?.gameType}
    >
      <Component {...props} />
    </SentryProfiler>
  );

  ProfiledComponent.displayName = `withSentryProfiler(${componentName})`;
  
  return ProfiledComponent;
}

/**
 * Hook for manual component performance tracking
 * 
 * @example
 * function MyComponent() {
 *   const trackRender = useComponentProfiler('MyComponent');
 *   
 *   useEffect(() => {
 *     trackRender('mount');
 *   }, []);
 *   
 *   return <div>Content</div>;
 * }
 */
export function useComponentProfiler(componentName: string) {
  const trackRender = React.useCallback((
    phase: 'mount' | 'update' | 'unmount',
    additionalData?: Record<string, any>
  ) => {
    startSpan(
      {
        op: 'react.component.lifecycle',
        name: `Component ${phase}: ${componentName}`
      },
      (span) => {
        span?.setAttribute('react.component_name', componentName);
        span?.setAttribute('react.lifecycle_phase', phase);
        span?.setAttribute('react.timestamp', Date.now());
        
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            span?.setAttribute(`react.${key}`, value);
          });
        }
      }
    );
  }, [componentName]);

  return trackRender;
}

/**
 * Hook for tracking component render performance
 * 
 * @example
 * function MyComponent() {
 *   const renderTime = useRenderTimer('MyComponent');
 *   
 *   // Component logic here
 *   
 *   return <div>Content</div>;
 * }
 */
export function useRenderTimer(componentName: string) {
  const startTime = React.useRef<number>(0);
  
  React.useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      if (renderTime > 1) { // Only track significant render times
        startSpan(
          {
            op: 'react.component.render',
            name: `Component Render: ${componentName}`
          },
          (span) => {
            span?.setAttribute('react.component_name', componentName);
            span?.setAttribute('react.render_time_ms', renderTime);
            span?.setAttribute('react.timestamp', Date.now());
          }
        );
      }
    };
  });

  return startTime.current;
}
