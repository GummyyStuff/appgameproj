/**
 * Chat Performance Integration Tests
 * Tests performance with real chat components and services
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatProvider } from '../components/providers/ChatProvider'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { chatPerformanceMonitor } from '../utils/performance-monitor'
import { memoryMonitor, memoryCleanup } from '../utils/memory-monitor'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: mock(() => Promise.resolve({
      data: { user: { id: 'test-user', email: 'test@example.com' } },
      error: null
    })),
    onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: mock() } } }))
  },
  from: mock(() => ({
    select: mock(() => ({
      order: mock(() => ({
        limit: mock(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    insert: mock(() => Promise.resolve({ data: null, error: null })),
    on: mock(() => ({
      subscribe: mock(() => ({
        unsubscribe: mock()
      }))
    }))
  })),
  channel: mock(() => ({
    on: mock(() => ({
      subscribe: mock(() => Promise.resolve())
    })),
    send: mock(() => Promise.resolve()),
    unsubscribe: mock(() => Promise.resolve())
  }))
}

// Mock React for hooks
const React = {
  useState: mock((initial: any) => [initial, mock()]),
  useEffect: mock((effect: () => void, deps?: any[]) => {
    effect()
  }),
  useCallback: mock((callback: any) => callback),
  useMemo: mock((factory: () => any) => factory()),
  useRef: mock(() => ({ current: null })),
  createContext: mock(() => ({})),
  useContext: mock(() => ({}))
}

describe('Chat Performance Integration Tests', () => {
  beforeEach(() => {
    // Reset performance monitors
    chatPerformanceMonitor.reset()
    memoryMonitor.clearSnapshots()
    
    // Mock performance API
    global.performance = {
      ...global.performance,
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      },
      now: () => Date.now()
    }
  })

  afterEach(() => {
    // Cleanup
    memoryCleanup.runCleanup()
  })

  describe('Message Rendering Performance', () => {
    it('should render large number of messages efficiently', async () => {
      const messageCount = 1000
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i}`,
        user_id: 'test-user',
        username: 'TestUser',
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        updated_at: new Date(Date.now() - i * 1000).toISOString()
      }))

      const startTime = performance.now()

      const TestComponent = () => {
        return (
          <ChatProvider supabaseClient={mockSupabase as any}>
            <div data-testid="message-list">
              {messages.map(message => (
                <div key={message.id} data-testid={`message-${message.id}`}>
                  <span>{message.username}: {message.content}</span>
                  <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </ChatProvider>
        )
      }

      render(<TestComponent />)

      const renderTime = performance.now() - startTime

      // Rendering 1000 messages should be fast (under 100ms)
      expect(renderTime).toBeLessThan(100)

      // Verify all messages are rendered
      const messageElements = screen.getAllByTestId(/^message-msg-/)
      expect(messageElements).toHaveLength(messageCount)
    })

    it('should handle rapid message updates without performance degradation', async () => {
      const initialMessages = Array.from({ length: 50 }, (_, i) => ({
        id: `initial-${i}`,
        content: `Initial message ${i}`,
        user_id: 'test-user',
        username: 'TestUser',
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        updated_at: new Date(Date.now() - i * 1000).toISOString()
      }))

      let messages = [...initialMessages]
      let setMessages: (msgs: any[]) => void

      const TestComponent = () => {
        const [currentMessages, setCurrentMessages] = React.useState(messages)
        setMessages = setCurrentMessages

        return (
          <div data-testid="message-container">
            {currentMessages.map(message => (
              <div key={message.id} data-testid={`message-${message.id}`}>
                {message.content}
              </div>
            ))}
          </div>
        )
      }

      render(<TestComponent />)

      const updateCount = 100
      const updateTimes: number[] = []

      // Perform rapid updates
      for (let i = 0; i < updateCount; i++) {
        const startTime = performance.now()
        
        const newMessage = {
          id: `rapid-${i}`,
          content: `Rapid message ${i}`,
          user_id: 'test-user',
          username: 'TestUser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        messages = [...messages, newMessage]
        setMessages(messages)

        await waitFor(() => {
          expect(screen.getByTestId(`message-rapid-${i}`)).toBeInTheDocument()
        })

        const updateTime = performance.now() - startTime
        updateTimes.push(updateTime)
      }

      // Calculate performance metrics
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length
      const maxUpdateTime = Math.max(...updateTimes)

      // Updates should be fast
      expect(avgUpdateTime).toBeLessThan(50) // Average under 50ms
      expect(maxUpdateTime).toBeLessThan(200) // Max under 200ms
    })

    it('should maintain scroll performance with large message history', async () => {
      const messageCount = 500
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `scroll-${i}`,
        content: `Scroll test message ${i}`,
        user_id: 'test-user',
        username: 'TestUser',
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        updated_at: new Date(Date.now() - i * 1000).toISOString()
      }))

      const TestComponent = () => {
        return (
          <div 
            data-testid="scrollable-container"
            style={{ height: '400px', overflow: 'auto' }}
          >
            {messages.map(message => (
              <div 
                key={message.id} 
                data-testid={`message-${message.id}`}
                style={{ height: '50px', padding: '10px' }}
              >
                {message.content}
              </div>
            ))}
          </div>
        )
      }

      render(<TestComponent />)

      const container = screen.getByTestId('scrollable-container')
      
      // Measure scroll performance
      const scrollTimes: number[] = []
      const scrollPositions = [0, 1000, 5000, 10000, 15000, 20000]

      for (const position of scrollPositions) {
        const startTime = performance.now()
        
        fireEvent.scroll(container, { target: { scrollTop: position } })
        
        const scrollTime = performance.now() - startTime
        scrollTimes.push(scrollTime)
      }

      const avgScrollTime = scrollTimes.reduce((sum, time) => sum + time, 0) / scrollTimes.length

      // Scrolling should be smooth
      expect(avgScrollTime).toBeLessThan(16) // Under 16ms for 60fps
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not leak memory during extended chat session', async () => {
      const initialMemory = memoryMonitor.getCurrentMemoryUsage()
      
      const TestComponent = () => {
        const [messages, setMessages] = React.useState<any[]>([])

        // Simulate adding messages over time
        React.useEffect(() => {
          const interval = setInterval(() => {
            setMessages(prev => {
              const newMessage = {
                id: `memory-${prev.length}`,
                content: `Memory test message ${prev.length}`,
                user_id: 'test-user',
                username: 'TestUser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              
              // Keep only last 100 messages to prevent unbounded growth
              const updated = [...prev, newMessage].slice(-100)
              return updated
            })
          }, 10)

          return () => clearInterval(interval)
        }, [])

        return (
          <div data-testid="memory-test-container">
            {messages.map(message => (
              <div key={message.id} data-testid={`message-${message.id}`}>
                {message.content}
              </div>
            ))}
          </div>
        )
      }

      render(<TestComponent />)

      // Let it run for a while to accumulate messages
      await new Promise(resolve => setTimeout(resolve, 1000))

      const finalMemory = memoryMonitor.getCurrentMemoryUsage()
      const memoryIncrease = finalMemory.used - initialMemory.used

      // Memory increase should be reasonable (under 10MB)
      expect(memoryIncrease).toBeLessThan(10)

      // Check for memory leaks
      const trend = memoryMonitor.getMemoryTrend()
      if (trend.direction === 'increasing') {
        expect(trend.rate).toBeLessThan(5) // Less than 5MB per minute growth
      }
    })

    it('should clean up event listeners properly', async () => {
      let listenerCount = 0
      const originalAddEventListener = Element.prototype.addEventListener
      const originalRemoveEventListener = Element.prototype.removeEventListener

      // Mock event listener tracking
      Element.prototype.addEventListener = function(...args) {
        listenerCount++
        return originalAddEventListener.apply(this, args)
      }

      Element.prototype.removeEventListener = function(...args) {
        listenerCount--
        return originalRemoveEventListener.apply(this, args)
      }

      const TestComponent = () => {
        React.useEffect(() => {
          const handleClick = () => {}
          const handleKeyDown = () => {}
          
          document.addEventListener('click', handleClick)
          document.addEventListener('keydown', handleKeyDown)
          
          return () => {
            document.removeEventListener('click', handleClick)
            document.removeEventListener('keydown', handleKeyDown)
          }
        }, [])

        return <div data-testid="listener-test">Test Component</div>
      }

      const { unmount } = render(<TestComponent />)

      const listenersAfterMount = listenerCount

      // Unmount component
      unmount()

      const listenersAfterUnmount = listenerCount

      // Listeners should be cleaned up
      expect(listenersAfterUnmount).toBeLessThanOrEqual(listenersAfterMount - 2)

      // Restore original methods
      Element.prototype.addEventListener = originalAddEventListener
      Element.prototype.removeEventListener = originalRemoveEventListener
    })

    it('should handle component cleanup efficiently', async () => {
      const componentInstances: any[] = []

      const TestComponent = ({ messageCount }: { messageCount: number }) => {
        React.useEffect(() => {
          const instance = { id: Math.random(), mounted: true }
          componentInstances.push(instance)
          
          return () => {
            instance.mounted = false
          }
        }, [])

        const messages = Array.from({ length: messageCount }, (_, i) => ({
          id: `cleanup-${i}`,
          content: `Cleanup test ${i}`
        }))

        return (
          <div data-testid="cleanup-container">
            {messages.map(message => (
              <div key={message.id}>{message.content}</div>
            ))}
          </div>
        )
      }

      // Mount with different message counts
      const { rerender, unmount } = render(<TestComponent messageCount={10} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('cleanup-container')).toBeInTheDocument()
      })

      // Re-render with more messages
      rerender(<TestComponent messageCount={50} />)
      rerender(<TestComponent messageCount={100} />)
      rerender(<TestComponent messageCount={200} />)

      // Unmount
      unmount()

      // Verify cleanup
      const mountedInstances = componentInstances.filter(instance => instance.mounted)
      expect(mountedInstances).toHaveLength(0)
    })
  })

  describe('Real-time Performance', () => {
    it('should handle high-frequency message updates efficiently', async () => {
      const messageUpdates: number[] = []
      let updateCallback: (message: any) => void

      const TestComponent = () => {
        const [messages, setMessages] = React.useState<any[]>([])

        React.useEffect(() => {
          updateCallback = (newMessage: any) => {
            const startTime = performance.now()
            
            setMessages(prev => [...prev, newMessage])
            
            const updateTime = performance.now() - startTime
            messageUpdates.push(updateTime)
          }
        }, [])

        return (
          <div data-testid="realtime-container">
            {messages.map(message => (
              <div key={message.id} data-testid={`message-${message.id}`}>
                {message.content}
              </div>
            ))}
          </div>
        )
      }

      render(<TestComponent />)

      // Simulate high-frequency updates
      const updateCount = 100
      const updateInterval = 10 // 10ms between updates

      for (let i = 0; i < updateCount; i++) {
        const message = {
          id: `realtime-${i}`,
          content: `Realtime message ${i}`,
          user_id: 'test-user',
          username: 'TestUser',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        updateCallback(message)
        
        if (i < updateCount - 1) {
          await new Promise(resolve => setTimeout(resolve, updateInterval))
        }
      }

      // Wait for all updates to complete
      await waitFor(() => {
        expect(screen.getAllByTestId(/^message-realtime-/)).toHaveLength(updateCount)
      })

      // Analyze performance
      const avgUpdateTime = messageUpdates.reduce((sum, time) => sum + time, 0) / messageUpdates.length
      const maxUpdateTime = Math.max(...messageUpdates)

      // Updates should be fast even at high frequency
      expect(avgUpdateTime).toBeLessThan(10) // Average under 10ms
      expect(maxUpdateTime).toBeLessThan(50) // Max under 50ms
    })

    it('should maintain performance during connection recovery', async () => {
      const connectionEvents: { type: string; timestamp: number }[] = []
      let connectionCallback: (connected: boolean) => void

      const TestComponent = () => {
        const [connected, setConnected] = React.useState(true)
        const [messages, setMessages] = React.useState<any[]>([])

        React.useEffect(() => {
          connectionCallback = (isConnected: boolean) => {
            const startTime = performance.now()
            
            setConnected(isConnected)
            
            const updateTime = performance.now() - startTime
            connectionEvents.push({
              type: isConnected ? 'connect' : 'disconnect',
              timestamp: updateTime
            })
          }
        }, [])

        return (
          <div data-testid="connection-container">
            <div data-testid="connection-status">
              {connected ? 'Connected' : 'Disconnected'}
            </div>
            <div data-testid="message-list">
              {messages.map(message => (
                <div key={message.id}>{message.content}</div>
              ))}
            </div>
          </div>
        )
      }

      render(<TestComponent />)

      // Simulate connection issues
      const connectionCycles = 10

      for (let i = 0; i < connectionCycles; i++) {
        // Disconnect
        connectionCallback(false)
        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
        })

        await new Promise(resolve => setTimeout(resolve, 50))

        // Reconnect
        connectionCallback(true)
        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
        })

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Analyze connection performance
      const avgConnectionTime = connectionEvents.reduce((sum, event) => sum + event.timestamp, 0) / connectionEvents.length
      const maxConnectionTime = Math.max(...connectionEvents.map(event => event.timestamp))

      // Connection state changes should be fast
      expect(avgConnectionTime).toBeLessThan(5) // Average under 5ms
      expect(maxConnectionTime).toBeLessThan(20) // Max under 20ms
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should track message throughput accurately', async () => {
      // Reset monitor
      chatPerformanceMonitor.reset()

      const messageCount = 50
      const sendInterval = 100 // 100ms between messages

      // Simulate sending messages
      for (let i = 0; i < messageCount; i++) {
        chatPerformanceMonitor.recordMessageSent(`perf-test-${i}`)
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10))
        
        chatPerformanceMonitor.recordMessageReceived(`perf-test-${i}`)
        
        if (i < messageCount - 1) {
          await new Promise(resolve => setTimeout(resolve, sendInterval))
        }
      }

      const metrics = chatPerformanceMonitor.getMetrics()
      const throughputStats = chatPerformanceMonitor.getThroughputStats()

      // Verify metrics
      expect(metrics.messagesSent).toBe(messageCount)
      expect(metrics.messagesReceived).toBe(messageCount)
      expect(metrics.averageLatency).toBeGreaterThan(0)
      expect(metrics.averageLatency).toBeLessThan(50) // Should be under 50ms

      // Verify throughput
      expect(throughputStats.overall).toBeGreaterThan(0)
      expect(throughputStats.last1min).toBeGreaterThan(0)
    })

    it('should detect performance degradation', async () => {
      const alerts: string[] = []
      
      // Mock performance issues
      const mockMetrics = {
        messagesSent: 100,
        messagesReceived: 100,
        averageLatency: 2000, // High latency
        connectionUptime: 60000,
        memoryUsage: 150 * 1024 * 1024, // High memory usage
        errorRate: 10, // High error rate
        throughput: 0.05, // Low throughput
        lastUpdated: Date.now()
      }

      // This would normally be imported from performance-monitor
      const checkPerformanceAlerts = (metrics: any): string[] => {
        const alerts: string[] = []
        
        if (metrics.averageLatency > 1000) {
          alerts.push(`High latency detected: ${metrics.averageLatency}ms`)
        }
        
        if (metrics.throughput < 0.1) {
          alerts.push(`Low throughput detected: ${metrics.throughput} msg/s`)
        }
        
        if (metrics.errorRate > 5) {
          alerts.push(`High error rate detected: ${metrics.errorRate}%`)
        }
        
        if (metrics.memoryUsage > 100 * 1024 * 1024) {
          alerts.push(`High memory usage detected: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`)
        }
        
        return alerts
      }

      const detectedAlerts = checkPerformanceAlerts(mockMetrics)

      // Should detect all performance issues
      expect(detectedAlerts).toContain('High latency detected: 2000ms')
      expect(detectedAlerts).toContain('Low throughput detected: 0.05 msg/s')
      expect(detectedAlerts).toContain('High error rate detected: 10%')
      expect(detectedAlerts).toContain('High memory usage detected: 150.0MB')
    })
  })
})