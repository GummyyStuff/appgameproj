/**
 * Sentry Test Page
 * 
 * This page helps test the frontend Sentry integration.
 * Remove or disable in production after testing.
 */

import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { startSpan, logger } from '../lib/sentry';

export function SentryTestPage() {
  const [results, setResults] = useState<string[]>([]);
  
  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testError = () => {
    try {
      throw new Error('Sentry React test error - this is intentional!');
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          testType: 'basic-error',
          timestamp: new Date().toISOString(),
          page: 'SentryTest'
        },
        tags: {
          test: 'true',
          errorType: 'intentional'
        }
      });
      addResult('✅ Error captured and sent to Sentry!');
    }
  };

  const testPerformance = () => {
    startSpan(
      {
        op: 'ui.click',
        name: 'Test Performance Button Click'
      },
      (span) => {
        span?.setAttribute('testType', 'performance');
        span?.setAttribute('page', 'SentryTest');
        
        // Simulate some work
        for (let i = 0; i < 1000000; i++) {
          Math.random();
        }
        
        span?.setAttribute('iterations', '1000000');
        addResult('✅ Performance span captured!');
      }
    );
  };

  const testLogging = () => {
    logger.trace('Test trace log from frontend', { logLevel: 'trace', test: true });
    logger.debug('Test debug log from frontend', { logLevel: 'debug', test: true });
    logger.info('Test info log from frontend', { logLevel: 'info', test: true });
    logger.warn('Test warning log from frontend', { logLevel: 'warn', test: true });
    logger.error('Test error log from frontend', { logLevel: 'error', test: true });
    
    addResult('✅ All log levels sent to Sentry!');
  };

  const testNestedSpans = () => {
    Sentry.startSpan(
      {
        op: 'ui.interaction',
        name: 'Parent Test Span'
      },
      (parentSpan) => {
        parentSpan?.setAttribute('spanType', 'parent');
        
        // Child span 1
        Sentry.startSpan(
          {
            op: 'ui.render',
            name: 'Child Span 1'
          },
          (childSpan) => {
            childSpan?.setAttribute('spanType', 'child');
            childSpan?.setAttribute('childNumber', 1);
            // Simulate work
            for (let i = 0; i < 500000; i++) Math.random();
          }
        );
        
        // Child span 2
        Sentry.startSpan(
          {
            op: 'ui.render',
            name: 'Child Span 2'
          },
          (childSpan) => {
            childSpan?.setAttribute('spanType', 'child');
            childSpan?.setAttribute('childNumber', 2);
            // Simulate work
            for (let i = 0; i < 500000; i++) Math.random();
          }
        );
        
        parentSpan?.setAttribute('childrenCount', 2);
        addResult('✅ Nested spans captured!');
      }
    );
  };

  const testAll = async () => {
    setResults([]);
    addResult('🚀 Starting comprehensive test...');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    testError();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    testPerformance();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    testLogging();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    testNestedSpans();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    addResult('🎉 All tests completed!');
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-tarkov-darker p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-tarkov-dark rounded-lg p-6 border-2 border-tarkov-accent mb-6">
          <h1 className="text-3xl font-tarkov text-tarkov-accent mb-2">
            🔍 Sentry Test Page
          </h1>
          <p className="text-gray-400">
            Test frontend Sentry integration. Remove this page in production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={testError}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Test Error Capture
          </button>
          
          <button
            onClick={testPerformance}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Test Performance Monitoring
          </button>
          
          <button
            onClick={testLogging}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Test Structured Logging
          </button>
          
          <button
            onClick={testNestedSpans}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Test Nested Spans
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={testAll}
            className="bg-tarkov-accent hover:bg-orange-500 text-tarkov-dark font-bold py-4 px-6 rounded-lg transition-colors"
          >
            🚀 Test All Features
          </button>
          
          <button
            onClick={clearResults}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            Clear Results
          </button>
        </div>

        <div className="bg-tarkov-dark rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-tarkov-accent mb-4">
            Test Results
          </h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500 italic">No tests run yet. Click a button above to test.</p>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-3 rounded font-mono text-sm text-green-400"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            📊 Check Your Dashboards
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">Frontend: </span>
              <a
                href="https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/
              </a>
            </div>
            <div>
              <span className="text-gray-400">Backend: </span>
              <a
                href="https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

