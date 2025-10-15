import React from 'react';
import { startSpan } from '../../lib/sentry';

/**
 * Sentry Tracing Test Component
 * 
 * This component provides UI buttons to test Sentry tracing functionality.
 * Remove or disable in production after testing.
 */
export function SentryTracingTest() {
  const testButtonClick = () => {
    startSpan(
      {
        op: "ui.click",
        name: "Test Button Click"
      },
      (span) => {
        span?.setAttribute("buttonType", "test");
        span?.setAttribute("component", "SentryTracingTest");
        
        // Simulate some work
        const startTime = performance.now();
        for (let i = 0; i < 1000000; i++) {
          Math.random();
        }
        const endTime = performance.now();
        
        span?.setAttribute("duration", `${endTime - startTime}ms`);
        span?.setAttribute("iterations", 1000000);
      }
    );
  };

  const testApiCall = async () => {
    await startSpan(
      {
        op: "http.client",
        name: "Test API Call"
      },
      async (span) => {
        span?.setAttribute("method", "GET");
        span?.setAttribute("endpoint", "/api/sentry-test/test-tracing");
        
        try {
          const response = await fetch('/api/sentry-test/test-tracing');
          const data = await response.json();
          
          span?.setAttribute("status", response.status);
          span?.setAttribute("success", true);
          
          console.log('API Test Response:', data);
        } catch (error) {
          span?.setAttribute("success", false);
          span?.setAttribute("error", error instanceof Error ? error.message : 'Unknown error');
          console.error('API Test Error:', error);
        }
      }
    );
  };

  const testNestedSpans = () => {
    startSpan(
      {
        op: "ui.interaction",
        name: "Nested Spans Test"
      },
      (parentSpan) => {
        parentSpan?.setAttribute("testType", "nested");
        
        // Child span 1
        startSpan(
          {
            op: "ui.render",
            name: "Child Span 1"
          },
          (childSpan1) => {
            childSpan1?.setAttribute("childNumber", 1);
            childSpan1?.setAttribute("operation", "render");
          }
        );
        
        // Child span 2
        startSpan(
          {
            op: "ui.update",
            name: "Child Span 2"
          },
          (childSpan2) => {
            childSpan2?.setAttribute("childNumber", 2);
            childSpan2?.setAttribute("operation", "update");
          }
        );
        
        parentSpan?.setAttribute("childrenCount", 2);
      }
    );
  };

  const testGameAction = () => {
    startSpan(
      {
        op: "game.action",
        name: "Play Game Action"
      },
      (span) => {
        span?.setAttribute("gameType", "coinflip");
        span?.setAttribute("betAmount", 100);
        span?.setAttribute("action", "play");
        
        // Simulate game logic
        const result = Math.random() > 0.5 ? 'win' : 'lose';
        span?.setAttribute("result", result);
        span?.setAttribute("payout", result === 'win' ? 200 : 0);
      }
    );
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Sentry Tracing Tests</h3>
      <div className="space-y-3">
        <button
          onClick={testButtonClick}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Button Click Span
        </button>
        
        <button
          onClick={testApiCall}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test API Call Span
        </button>
        
        <button
          onClick={testNestedSpans}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Nested Spans
        </button>
        
        <button
          onClick={testGameAction}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Test Game Action Span
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Check your Sentry dashboard to see the traces:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Frontend: <a href="https://juan-moran-ramirez.sentry.io/projects/tarkov-frontend/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sentry Frontend Dashboard</a></li>
          <li>Backend: <a href="https://juan-moran-ramirez.sentry.io/projects/tarkov-backend/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sentry Backend Dashboard</a></li>
        </ul>
      </div>
    </div>
  );
}
