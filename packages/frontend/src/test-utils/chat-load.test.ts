/**
 * Load Tests for Chat System
 * Tests multiple concurrent users and high message volume
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

// Mock WebSocket for load testing
class MockWebSocket {
  static instances: MockWebSocket[] = []
  
  public readyState: number = WebSocket.CONNECTING
  public onopen?: (event: Event) => void
  public onmessage?: (event: MessageEvent) => void
  public onerror?: (event: Event) => void
  public onclose?: (event: CloseEvent) => void
  
  private messageQueue: any[] = []
  private isConnected = false

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.isConnected = true
      this.onopen?.(new Event('open'))
      
      // Process queued messages
      this.messageQueue.forEach(message => {
        this.simulateReceiveMessage(message)
      })
      this.messageQueue = []
    }, Math.random() * 100) // Random delay 0-100ms
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }

    const message = JSON.parse(data)
    
    // Simulate message broadcast to all other instances
    setTimeout(() => {
      MockWebSocket.instances.forEach(instance => {
        if (instance !== this && instance.isConnected) {
          instance.simulateReceiveMessage(message)
        }
      })
    }, Math.random() * 50) // Random latency 0-50ms
  }

  close(): void {
    this.readyState = WebSocket.CLOSED
    this.isConnected = false
    this.onclose?.(new CloseEvent('close'))
    
    const index = MockWebSocket.instances.indexOf(this)
    if (index > -1) {
      MockWebSocket.instances.splice(index, 1)
    }
  }

  private simulateReceiveMessage(message: any): void {
    if (this.isConnected && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }))
    } else {
      this.messageQueue.push(message)
    }
  }

  static reset(): void {
    MockWebSocket.instances.forEach(instance => instance.close())
    MockWebSocket.instances = []
  }
}

// Mock chat service for load testing
class MockChatService {
  private ws?: MockWebSocket
  private messageHandlers: ((message: any) => void)[] = []
  private connectionHandlers: ((connected: boolean) => void)[] = []
  private isConnected = false

  async connect(): Promise<void> {
    this.ws = new MockWebSocket('ws://localhost:3000/chat')
    
    this.ws.onopen = () => {
      this.isConnected = true
      this.connectionHandlers.forEach(handler => handler(true))
    }

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.messageHandlers.forEach(handler => handler(message))
    }

    this.ws.onclose = () => {
      this.isConnected = false
      this.connectionHandlers.forEach(handler => handler(false))
    }

    this.ws.onerror = () => {
      this.isConnected = false
      this.connectionHandlers.forEach(handler => handler(false))
    }
  }

  async sendMessage(content: string, userId: string, username: string): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected')
    }

    const message = {
      type: 'message',
      content,
      userId,
      username,
      timestamp: Date.now()
    }

    this.ws.send(JSON.stringify(message))
  }

  onMessage(handler: (message: any) => void): () => void {
    this.messageHandlers.push(handler)
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) {
        this.messageHandlers.splice(index, 1)
      }
    }
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler)
    return () => {
      const index = this.connectionHandlers.indexOf(handler)
      if (index > -1) {
        this.connectionHandlers.splice(index, 1)
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }
  }

  get connected(): boolean {
    return this.isConnected
  }
}

// Mock user for load testing
class MockUser {
  private chatService: MockChatService
  private messagesReceived: any[] = []
  private connectionStatus = false
  private messagesSent = 0

  constructor(
    public userId: string,
    public username: string
  ) {
    this.chatService = new MockChatService()
    
    this.chatService.onMessage((message) => {
      this.messagesReceived.push(message)
    })

    this.chatService.onConnectionChange((connected) => {
      this.connectionStatus = connected
    })
  }

  async connect(): Promise<void> {
    await this.chatService.connect()
    
    // Wait for connection
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.connectionStatus) {
          resolve()
        } else {
          setTimeout(checkConnection, 10)
        }
      }
      checkConnection()
    })
  }

  async sendMessage(content: string): Promise<void> {
    await this.chatService.sendMessage(content, this.userId, this.username)
    this.messagesSent++
  }

  disconnect(): void {
    this.chatService.disconnect()
  }

  getStats() {
    return {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived.length,
      connected: this.connectionStatus,
      lastMessage: this.messagesReceived[this.messagesReceived.length - 1]
    }
  }

  clearMessages(): void {
    this.messagesReceived = []
  }
}

describe('Chat System Load Tests', () => {
  beforeEach(() => {
    MockWebSocket.reset()
  })

  afterEach(() => {
    MockWebSocket.reset()
  })

  describe('Concurrent User Tests', () => {
    it('should handle 10 concurrent users', async () => {
      const users: MockUser[] = []
      
      // Create 10 users
      for (let i = 0; i < 10; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      // Connect all users
      await Promise.all(users.map(user => user.connect()))

      // Verify all users are connected
      users.forEach(user => {
        expect(user.getStats().connected).toBe(true)
      })

      // Each user sends a message
      await Promise.all(users.map((user, index) => 
        user.sendMessage(`Hello from ${user.username}!`)
      ))

      // Wait for message propagation
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verify all users received all messages
      users.forEach(user => {
        const stats = user.getStats()
        expect(stats.messagesReceived).toBe(10) // Should receive all 10 messages
        expect(stats.messagesSent).toBe(1) // Should have sent 1 message
      })

      // Cleanup
      users.forEach(user => user.disconnect())
    })

    it('should handle 50 concurrent users', async () => {
      const users: MockUser[] = []
      
      // Create 50 users
      for (let i = 0; i < 50; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      const startTime = Date.now()

      // Connect all users in batches to avoid overwhelming
      const batchSize = 10
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        await Promise.all(batch.map(user => user.connect()))
        await new Promise(resolve => setTimeout(resolve, 50)) // Small delay between batches
      }

      const connectionTime = Date.now() - startTime

      // Verify all users are connected
      users.forEach(user => {
        expect(user.getStats().connected).toBe(true)
      })

      // Connection should complete within reasonable time (10 seconds)
      expect(connectionTime).toBeLessThan(10000)

      // Send messages from random users
      const messageSendTime = Date.now()
      const sendingUsers = users.slice(0, 10) // First 10 users send messages
      
      await Promise.all(sendingUsers.map((user, index) => 
        user.sendMessage(`Load test message ${index}`)
      ))

      // Wait for message propagation
      await new Promise(resolve => setTimeout(resolve, 500))

      const totalMessageTime = Date.now() - messageSendTime

      // Verify message delivery
      users.forEach(user => {
        const stats = user.getStats()
        expect(stats.messagesReceived).toBe(10) // Should receive all 10 messages
      })

      // Message delivery should be fast (under 2 seconds)
      expect(totalMessageTime).toBeLessThan(2000)

      // Cleanup
      users.forEach(user => user.disconnect())
    })

    it('should handle 100 concurrent users with limited message sending', async () => {
      const users: MockUser[] = []
      
      // Create 100 users
      for (let i = 0; i < 100; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      const startTime = Date.now()

      // Connect users in smaller batches
      const batchSize = 20
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        await Promise.all(batch.map(user => user.connect()))
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const connectionTime = Date.now() - startTime

      // Verify connections
      const connectedUsers = users.filter(user => user.getStats().connected)
      expect(connectedUsers.length).toBeGreaterThan(90) // At least 90% should connect

      // Only a subset sends messages to avoid overwhelming
      const sendingUsers = users.slice(0, 5)
      
      await Promise.all(sendingUsers.map((user, index) => 
        user.sendMessage(`Stress test message ${index}`)
      ))

      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify message delivery to connected users
      connectedUsers.forEach(user => {
        const stats = user.getStats()
        expect(stats.messagesReceived).toBe(5)
      })

      // Cleanup
      users.forEach(user => user.disconnect())
    })
  })

  describe('High Message Volume Tests', () => {
    it('should handle rapid message sending from single user', async () => {
      const user = new MockUser('testuser', 'TestUser')
      await user.connect()

      const messageCount = 100
      const startTime = Date.now()

      // Send messages rapidly
      const promises = []
      for (let i = 0; i < messageCount; i++) {
        promises.push(user.sendMessage(`Rapid message ${i}`))
      }

      await Promise.all(promises)
      const sendTime = Date.now() - startTime

      // Should be able to send 100 messages quickly (under 5 seconds)
      expect(sendTime).toBeLessThan(5000)
      expect(user.getStats().messagesSent).toBe(messageCount)

      user.disconnect()
    })

    it('should handle burst messages from multiple users', async () => {
      const users: MockUser[] = []
      const userCount = 5
      const messagesPerUser = 20

      // Create and connect users
      for (let i = 0; i < userCount; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      await Promise.all(users.map(user => user.connect()))

      const startTime = Date.now()

      // All users send messages simultaneously
      const allPromises = users.flatMap(user => 
        Array.from({ length: messagesPerUser }, (_, i) => 
          user.sendMessage(`Burst message ${i} from ${user.username}`)
        )
      )

      await Promise.all(allPromises)

      // Wait for all messages to propagate
      await new Promise(resolve => setTimeout(resolve, 1000))

      const totalTime = Date.now() - startTime
      const totalMessages = userCount * messagesPerUser

      // Verify all messages were sent and received
      users.forEach(user => {
        const stats = user.getStats()
        expect(stats.messagesSent).toBe(messagesPerUser)
        expect(stats.messagesReceived).toBe(totalMessages)
      })

      // Should handle burst within reasonable time
      expect(totalTime).toBeLessThan(10000)

      users.forEach(user => user.disconnect())
    })

    it('should maintain performance with sustained high load', async () => {
      const users: MockUser[] = []
      const userCount = 3
      const duration = 5000 // 5 seconds
      const messageInterval = 100 // Send message every 100ms

      // Create and connect users
      for (let i = 0; i < userCount; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      await Promise.all(users.map(user => user.connect()))

      const startTime = Date.now()
      const intervals: NodeJS.Timeout[] = []

      // Each user sends messages at regular intervals
      users.forEach((user, userIndex) => {
        let messageCount = 0
        const interval = setInterval(async () => {
          if (Date.now() - startTime >= duration) {
            clearInterval(interval)
            return
          }

          try {
            await user.sendMessage(`Sustained message ${messageCount++} from ${user.username}`)
          } catch (error) {
            console.error('Failed to send message:', error)
          }
        }, messageInterval)

        intervals.push(interval)
      })

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration + 500))

      // Clear intervals
      intervals.forEach(interval => clearInterval(interval))

      // Verify performance
      const expectedMessagesPerUser = Math.floor(duration / messageInterval)
      const totalExpectedMessages = expectedMessagesPerUser * userCount

      users.forEach(user => {
        const stats = user.getStats()
        
        // Should have sent approximately the expected number of messages
        expect(stats.messagesSent).toBeGreaterThan(expectedMessagesPerUser * 0.8)
        
        // Should have received approximately all messages
        expect(stats.messagesReceived).toBeGreaterThan(totalExpectedMessages * 0.8)
      })

      users.forEach(user => user.disconnect())
    })
  })

  describe('Connection Stability Tests', () => {
    it('should handle users joining and leaving during active chat', async () => {
      const permanentUsers: MockUser[] = []
      const temporaryUsers: MockUser[] = []

      // Create permanent users
      for (let i = 0; i < 3; i++) {
        permanentUsers.push(new MockUser(`permanent${i}`, `Permanent${i}`))
      }

      await Promise.all(permanentUsers.map(user => user.connect()))

      // Start continuous messaging from permanent users
      const messageInterval = setInterval(async () => {
        const randomUser = permanentUsers[Math.floor(Math.random() * permanentUsers.length)]
        await randomUser.sendMessage(`Continuous message from ${randomUser.username}`)
      }, 200)

      // Simulate users joining and leaving
      for (let round = 0; round < 5; round++) {
        // Add temporary users
        for (let i = 0; i < 2; i++) {
          const user = new MockUser(`temp${round}_${i}`, `Temp${round}_${i}`)
          temporaryUsers.push(user)
          await user.connect()
        }

        // Let them participate briefly
        await new Promise(resolve => setTimeout(resolve, 500))

        // Send messages from temporary users
        await Promise.all(temporaryUsers.slice(-2).map(user => 
          user.sendMessage(`Hello from temporary user ${user.username}`)
        ))

        await new Promise(resolve => setTimeout(resolve, 300))

        // Remove some temporary users
        const usersToRemove = temporaryUsers.splice(0, Math.min(2, temporaryUsers.length))
        usersToRemove.forEach(user => user.disconnect())

        await new Promise(resolve => setTimeout(resolve, 200))
      }

      clearInterval(messageInterval)

      // Verify permanent users are still connected and functioning
      permanentUsers.forEach(user => {
        expect(user.getStats().connected).toBe(true)
        expect(user.getStats().messagesReceived).toBeGreaterThan(0)
      })

      // Cleanup
      permanentUsers.forEach(user => user.disconnect())
      temporaryUsers.forEach(user => user.disconnect())
    })

    it('should recover from mass disconnection', async () => {
      const users: MockUser[] = []
      
      // Create users
      for (let i = 0; i < 10; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      await Promise.all(users.map(user => user.connect()))

      // Verify all connected
      users.forEach(user => {
        expect(user.getStats().connected).toBe(true)
      })

      // Simulate mass disconnection
      users.forEach(user => user.disconnect())

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Reconnect all users
      await Promise.all(users.map(user => user.connect()))

      // Verify recovery
      users.forEach(user => {
        expect(user.getStats().connected).toBe(true)
      })

      // Test functionality after recovery
      await users[0].sendMessage('Recovery test message')
      await new Promise(resolve => setTimeout(resolve, 100))

      users.forEach(user => {
        expect(user.getStats().messagesReceived).toBe(1)
      })

      users.forEach(user => user.disconnect())
    })
  })

  describe('Performance Benchmarks', () => {
    it('should measure message latency under load', async () => {
      const users: MockUser[] = []
      const userCount = 5
      
      for (let i = 0; i < userCount; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      await Promise.all(users.map(user => user.connect()))

      const latencies: number[] = []
      const messageCount = 50

      // Measure latency for each message
      for (let i = 0; i < messageCount; i++) {
        const sender = users[i % userCount]
        const startTime = Date.now()
        
        await sender.sendMessage(`Latency test message ${i}`)
        
        // Wait for message to be received by all users
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const endTime = Date.now()
        latencies.push(endTime - startTime)
      }

      // Calculate statistics
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      const maxLatency = Math.max(...latencies)
      const minLatency = Math.min(...latencies)

      console.log(`Latency stats - Avg: ${avgLatency}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`)

      // Verify acceptable performance
      expect(avgLatency).toBeLessThan(200) // Average under 200ms
      expect(maxLatency).toBeLessThan(500) // Max under 500ms

      users.forEach(user => user.disconnect())
    })

    it('should measure throughput capacity', async () => {
      const users: MockUser[] = []
      const userCount = 3
      
      for (let i = 0; i < userCount; i++) {
        users.push(new MockUser(`user${i}`, `User${i}`))
      }

      await Promise.all(users.map(user => user.connect()))

      const testDuration = 3000 // 3 seconds
      const startTime = Date.now()
      let messagesSent = 0

      // Send messages as fast as possible
      const sendPromises: Promise<void>[] = []
      
      while (Date.now() - startTime < testDuration) {
        const sender = users[messagesSent % userCount]
        sendPromises.push(sender.sendMessage(`Throughput test ${messagesSent++}`))
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      await Promise.all(sendPromises)
      
      const actualDuration = Date.now() - startTime
      const throughput = messagesSent / (actualDuration / 1000) // messages per second

      console.log(`Throughput: ${throughput.toFixed(2)} messages/second`)

      // Verify reasonable throughput
      expect(throughput).toBeGreaterThan(10) // At least 10 messages per second

      users.forEach(user => user.disconnect())
    })
  })
})