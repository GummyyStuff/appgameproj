/**
 * Sentry Test Routes
 * 
 * These endpoints are for testing Sentry integration.
 * Remove or disable in production after testing.
 */

import { Hono } from 'hono';
import * as Sentry from '@sentry/bun';
import { startSpan, logger } from '../lib/sentry';

export const sentryTestRoutes = new Hono();

/**
 * Test basic error capture
 */
sentryTestRoutes.get('/test-error', (c) => {
  try {
    throw new Error('Sentry Bun test error - this is intentional!');
  } catch (e) {
    Sentry.captureException(e, {
      extra: {
        testType: 'basic-error',
        timestamp: new Date().toISOString(),
        endpoint: '/api/sentry-test/test-error'
      },
      tags: {
        test: 'true',
        errorType: 'intentional'
      }
    });
    
    return c.json({
      success: true,
      message: 'Error captured and sent to Sentry!',
      check: 'Visit https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/ to see it'
    });
  }
});

/**
 * Test performance monitoring with spans
 */
sentryTestRoutes.get('/test-performance', async (c) => {
  const result = await startSpan(
    {
      op: 'test.performance',
      name: 'Performance Test Span'
    },
    async (span) => {
      span?.setAttribute('testType', 'performance');
      span?.setAttribute('endpoint', '/api/sentry-test/test-performance');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      span?.setAttribute('duration', '100ms');
      
      return { completed: true };
    }
  );
  
  return c.json({
    success: true,
    message: 'Performance span captured!',
    result,
    check: 'Visit https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/ Performance tab'
  });
});

/**
 * Test structured logging
 */
sentryTestRoutes.get('/test-logging', (c) => {
  // Test all log levels
  logger.trace('Test trace log', { logLevel: 'trace', test: true });
  logger.debug('Test debug log', { logLevel: 'debug', test: true });
  logger.info('Test info log', { logLevel: 'info', test: true });
  logger.warn('Test warning log', { logLevel: 'warn', test: true });
  logger.error('Test error log', { logLevel: 'error', test: true });
  
  return c.json({
    success: true,
    message: 'All log levels sent to Sentry!',
    levels: ['trace', 'debug', 'info', 'warn', 'error'],
    check: 'Visit https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/ Logs section'
  });
});

/**
 * Test nested spans (parent-child)
 */
sentryTestRoutes.get('/test-nested-spans', async (c) => {
  await Sentry.startSpan(
    {
      op: 'test.parent',
      name: 'Parent Test Span'
    },
    async (parentSpan) => {
      parentSpan?.setAttribute('spanType', 'parent');
      
      // Child span 1
      await Sentry.startSpan(
        {
          op: 'test.child1',
          name: 'Child Span 1'
        },
        async (childSpan) => {
          childSpan?.setAttribute('spanType', 'child');
          childSpan?.setAttribute('childNumber', 1);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      );
      
      // Child span 2
      await Sentry.startSpan(
        {
          op: 'test.child2',
          name: 'Child Span 2'
        },
        async (childSpan) => {
          childSpan?.setAttribute('spanType', 'child');
          childSpan?.setAttribute('childNumber', 2);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      );
      
      parentSpan?.setAttribute('childrenCount', 2);
    }
  );
  
  return c.json({
    success: true,
    message: 'Nested spans (parent + 2 children) captured!',
    check: 'Visit https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/ Performance tab'
  });
});

/**
 * Test all features at once
 */
sentryTestRoutes.get('/test-all', async (c) => {
  const results = {
    error: false,
    performance: false,
    logging: false,
    nestedSpans: false
  };
  
  try {
    // 1. Test error capture
    try {
      throw new Error('Comprehensive Sentry test error');
    } catch (e) {
      Sentry.captureException(e, {
        tags: { test: 'comprehensive' }
      });
      results.error = true;
    }
    
    // 2. Test performance
    await startSpan(
      { op: 'test.comprehensive', name: 'Comprehensive Test' },
      async (span) => {
        span?.setAttribute('testType', 'comprehensive');
        await new Promise(resolve => setTimeout(resolve, 50));
        results.performance = true;
      }
    );
    
    // 3. Test logging
    logger.info('Comprehensive test completed', {
      results,
      timestamp: new Date().toISOString()
    });
    results.logging = true;
    
    // 4. Test nested spans
    await Sentry.startSpan(
      { op: 'test.nested', name: 'Nested Test' },
      async () => {
        await Sentry.startSpan(
          { op: 'test.child', name: 'Child Test' },
          async () => {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        );
        results.nestedSpans = true;
      }
    );
    
    return c.json({
      success: true,
      message: 'All Sentry features tested!',
      results,
      dashboard: {
        errors: 'https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/',
        performance: 'https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/?project=4510191069167616&statsPeriod=1h',
      }
    });
    
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
});

/**
 * Get Sentry configuration info
 */
sentryTestRoutes.get('/config', (c) => {
  return c.json({
    configured: !!process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    dsnConfigured: process.env.SENTRY_DSN ? 'Yes (hidden for security)' : 'No',
    runtime: 'Bun',
    bunVersion: '1.3.0',
    sentrySDK: '@sentry/bun',
    dashboards: {
      frontend: 'https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/',
      backend: 'https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/'
    }
  });
});

