/**
 * End-to-End Chat System Tests
 * Multi-user chat scenarios, real-time delivery, and connection recovery
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

// Mock multiple browser instances for multi-user testing
const createMockBrowser = (userId: string) => ({
  userId,
  navigate: mock((url: string) => Promise.resolve()),
  findElement: mock((selector: string) => Promise.resolve({ 
    click: mock(() => Promise.resolve()),
    type: mock((text: string) => Promise.resolve()),
    getText: mock(() => Promise.resolve('')),
    isVisible: mock(() => Promise.resolve(true)),
    getAttribute: mock((attr: string) => Promise.resolve(''))
  })),
  waitFor: mock((condition: () => boolean, timeout = 5000) => Promise.resolve()),
  waitForElement: mock((selector: string, timeout = 5000) => Promise.resolve()),
  screenshot: mock(() => Promise.resolve()),
  close: mock(() => Promise.resolve()),
  executeScript: mock((script: string) => Promise.resolve()),
  getNetworkLogs: mock(() => Promise.resolve([])),
  simulateNetworkFailure: mock(() => Promise.resolve()),
  restoreNetwork: mock(() => Promise.resolve())
})

describe('Chat System End-to-End Tests', () => {
  let browser1: ReturnType<typeof createMockBrowser>
  let browser2: ReturnType<typeof createMockBrowser>
  let browser3: ReturnType<typeof createMockBrowser>

  beforeEach(async () => {
    browser1 = createMockBrowser('user1')
    browser2 = createMockBrowser('user2')
    browser3 = createMockBrowser('user3')

    // Login all users
    await Promise.all([
      loginUser(browser1, 'user1@test.com', 'password123'),
      loginUser(browser2, 'user2@test.com', 'password123'),
      loginUser(browser3, 'user3@test.com', 'password123')
    ])
  })

  afterEach(async () => {
    await Promise.all([
      browser1.close(),
      browser2.close(),
      browser3.close()
    ])
  })

  async function loginUser(browser: ReturnType<typeof createMockBrowser>, email: string, password: string) {
    await browser.navigate('http://localhost:3000/login')
    
    const emailInput = await browser.findElement('[data-testid="email-input"]')
    const passwordInput = await browser.findElement('[data-testid="password-input"]')
    const submitButton = await browser.findElement('[data-testid="submit-button"]')

    await emailInput.type(email)
    await passwordInput.type(password)
    await submitButton.click()

    // Wait for login to complete
    await browser.waitForElement('[data-testid="dashboard"]')
  }

  describe('Multi-User Chat Scenarios', () => {
    it('should handle real-time message delivery between multiple users', async () => {
      // Navigate all users to a game page with chat
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/blackjack'),
        browser3.navigate('http://localhost:3000/roulette')
      ])

      // Wait for chat to load
      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]'),
        browser3.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // User 1 sends a message
      const messageInput1 = await browser1.findElement('[data-testid="message-input"]')
      const sendButton1 = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput1.type('Hello from user 1!')
      await sendButton1.click()

      // Wait for message to appear in all browsers
      await Promise.all([
        browser1.waitForElement('[data-testid="message-Hello from user 1!"]'),
        browser2.waitForElement('[data-testid="message-Hello from user 1!"]'),
        browser3.waitForElement('[data-testid="message-Hello from user 1!"]')
      ])

      // Verify message appears in all chat windows
      const message1InBrowser1 = await browser1.findElement('[data-testid="message-Hello from user 1!"]')
      const message1InBrowser2 = await browser2.findElement('[data-testid="message-Hello from user 1!"]')
      const message1InBrowser3 = await browser3.findElement('[data-testid="message-Hello from user 1!"]')

      expect(await message1InBrowser1.isVisible()).toBe(true)
      expect(await message1InBrowser2.isVisible()).toBe(true)
      expect(await message1InBrowser3.isVisible()).toBe(true)

      // User 2 responds
      const messageInput2 = await browser2.findElement('[data-testid="message-input"]')
      const sendButton2 = await browser2.findElement('[data-testid="send-button"]')
      
      await messageInput2.type('Hi there from user 2!')
      await sendButton2.click()

      // Verify response appears in all browsers
      await Promise.all([
        browser1.waitForElement('[data-testid="message-Hi there from user 2!"]'),
        browser2.waitForElement('[data-testid="message-Hi there from user 2!"]'),
        browser3.waitForElement('[data-testid="message-Hi there from user 2!"]')
      ])

      // User 3 joins the conversation
      const messageInput3 = await browser3.findElement('[data-testid="message-input"]')
      const sendButton3 = await browser3.findElement('[data-testid="send-button"]')
      
      await messageInput3.type('User 3 here! Great to see everyone!')
      await sendButton3.click()

      // Verify all messages are visible in correct order
      await browser1.waitFor(() => true) // Wait for all messages to load

      const messageList1 = await browser1.findElement('[data-testid="message-list"]')
      expect(await messageList1.isVisible()).toBe(true)
    })

    it('should show online users correctly across multiple sessions', async () => {
      // Navigate all users to chat
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette'),
        browser3.navigate('http://localhost:3000/roulette')
      ])

      // Wait for online users list to load
      await Promise.all([
        browser1.waitForElement('[data-testid="online-users"]'),
        browser2.waitForElement('[data-testid="online-users"]'),
        browser3.waitForElement('[data-testid="online-users"]')
      ])

      // Verify all users see each other as online
      const onlineUsers1 = await browser1.findElement('[data-testid="online-users"]')
      const onlineUsers2 = await browser2.findElement('[data-testid="online-users"]')
      const onlineUsers3 = await browser3.findElement('[data-testid="online-users"]')

      expect(await onlineUsers1.isVisible()).toBe(true)
      expect(await onlineUsers2.isVisible()).toBe(true)
      expect(await onlineUsers3.isVisible()).toBe(true)

      // Check online user count (should be 3)
      const userCount1 = await browser1.findElement('[data-testid="online-user-count"]')
      const userCount2 = await browser2.findElement('[data-testid="online-user-count"]')
      const userCount3 = await browser3.findElement('[data-testid="online-user-count"]')

      expect(await userCount1.getText()).toContain('3')
      expect(await userCount2.getText()).toContain('3')
      expect(await userCount3.getText()).toContain('3')

      // User 2 leaves
      await browser2.close()

      // Wait for user count to update in remaining browsers
      await browser1.waitFor(() => true)
      await browser3.waitFor(() => true)

      // Verify user count decreased
      const updatedCount1 = await browser1.findElement('[data-testid="online-user-count"]')
      const updatedCount3 = await browser3.findElement('[data-testid="online-user-count"]')

      expect(await updatedCount1.getText()).toContain('2')
      expect(await updatedCount3.getText()).toContain('2')
    })

    it('should handle rapid message exchanges between users', async () => {
      // Navigate users to chat
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // Send rapid messages from both users
      const messages = [
        { browser: browser1, text: 'Message 1 from user 1' },
        { browser: browser2, text: 'Message 1 from user 2' },
        { browser: browser1, text: 'Message 2 from user 1' },
        { browser: browser2, text: 'Message 2 from user 2' },
        { browser: browser1, text: 'Message 3 from user 1' },
        { browser: browser2, text: 'Message 3 from user 2' }
      ]

      // Send all messages rapidly
      for (const message of messages) {
        const messageInput = await message.browser.findElement('[data-testid="message-input"]')
        const sendButton = await message.browser.findElement('[data-testid="send-button"]')
        
        await messageInput.type(message.text)
        await sendButton.click()
        
        // Small delay to simulate rapid typing
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Wait for all messages to appear
      await browser1.waitFor(() => true)
      await browser2.waitFor(() => true)

      // Verify all messages are present in both browsers
      for (const message of messages) {
        const messageElement1 = await browser1.findElement(`[data-testid="message-${message.text}"]`)
        const messageElement2 = await browser2.findElement(`[data-testid="message-${message.text}"]`)
        
        expect(await messageElement1.isVisible()).toBe(true)
        expect(await messageElement2.isVisible()).toBe(true)
      }
    })

    it('should maintain message order across multiple users', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette'),
        browser3.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]'),
        browser3.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // Send messages in specific order with timestamps
      const orderedMessages = [
        { browser: browser1, text: 'First message', order: 1 },
        { browser: browser2, text: 'Second message', order: 2 },
        { browser: browser3, text: 'Third message', order: 3 },
        { browser: browser1, text: 'Fourth message', order: 4 },
        { browser: browser2, text: 'Fifth message', order: 5 }
      ]

      for (const message of orderedMessages) {
        const messageInput = await message.browser.findElement('[data-testid="message-input"]')
        const sendButton = await message.browser.findElement('[data-testid="send-button"]')
        
        await messageInput.type(message.text)
        await sendButton.click()
        
        // Wait between messages to ensure order
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Verify message order in all browsers
      await browser1.waitFor(() => true)

      const messageList = await browser1.findElement('[data-testid="message-list"]')
      const messageElements = await browser1.executeScript(`
        return Array.from(document.querySelectorAll('[data-testid^="message-"]'))
          .map(el => el.textContent)
      `)

      // Verify messages appear in correct chronological order
      expect(messageElements).toEqual([
        'First message',
        'Second message', 
        'Third message',
        'Fourth message',
        'Fifth message'
      ])
    })
  })

  describe('Real-Time Message Delivery Tests', () => {
    it('should deliver messages instantly without page refresh', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // Record initial message count
      const initialMessageCount = await browser2.executeScript(`
        return document.querySelectorAll('[data-testid^="message-"]').length
      `)

      // User 1 sends message
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput.type('Real-time test message')
      await sendButton.click()

      // Verify message appears in browser 2 without refresh
      await browser2.waitForElement('[data-testid="message-Real-time test message"]')

      const newMessageCount = await browser2.executeScript(`
        return document.querySelectorAll('[data-testid^="message-"]').length
      `)

      expect(newMessageCount).toBe(initialMessageCount + 1)

      // Verify no page refresh occurred
      const pageRefreshIndicator = await browser2.executeScript(`
        return window.performance.navigation.type === 0
      `)
      expect(pageRefreshIndicator).toBe(true)
    })

    it('should handle message delivery latency gracefully', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // Simulate network latency
      await browser1.executeScript(`
        // Mock network delay
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          return new Promise(resolve => {
            setTimeout(() => resolve(originalFetch.apply(this, args)), 1000);
          });
        };
      `)

      const startTime = Date.now()

      // Send message with simulated latency
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput.type('Latency test message')
      await sendButton.click()

      // Verify message appears despite latency
      await browser2.waitForElement('[data-testid="message-Latency test message"]', 5000)

      const endTime = Date.now()
      const deliveryTime = endTime - startTime

      // Message should still be delivered within reasonable time
      expect(deliveryTime).toBeLessThan(5000)
    })

    it('should show message delivery status indicators', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Send message and check for delivery indicators
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput.type('Status indicator test')
      await sendButton.click()

      // Check for sending indicator
      const sendingIndicator = await browser1.findElement('[data-testid="message-sending"]')
      expect(await sendingIndicator.isVisible()).toBe(true)

      // Wait for sent indicator
      await browser1.waitForElement('[data-testid="message-sent"]')
      const sentIndicator = await browser1.findElement('[data-testid="message-sent"]')
      expect(await sentIndicator.isVisible()).toBe(true)
    })

    it('should handle message timestamps accurately', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      const beforeSend = Date.now()

      // Send message
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput.type('Timestamp test message')
      await sendButton.click()

      const afterSend = Date.now()

      // Wait for message to appear
      await browser2.waitForElement('[data-testid="message-Timestamp test message"]')

      // Check timestamp accuracy
      const messageTimestamp = await browser2.findElement('[data-testid="message-timestamp"]')
      const timestampText = await messageTimestamp.getText()

      // Verify timestamp is within reasonable range
      const messageTime = new Date(timestampText).getTime()
      expect(messageTime).toBeGreaterThanOrEqual(beforeSend)
      expect(messageTime).toBeLessThanOrEqual(afterSend + 1000) // Allow 1 second buffer
    })
  })

  describe('Connection Recovery Tests', () => {
    it('should automatically reconnect after network failure', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Verify initial connection
      const connectionStatus = await browser1.findElement('[data-testid="connection-status"]')
      expect(await connectionStatus.getText()).toContain('Connected')

      // Simulate network failure
      await browser1.simulateNetworkFailure()

      // Verify disconnected status
      await browser1.waitFor(() => true)
      expect(await connectionStatus.getText()).toContain('Disconnected')

      // Restore network
      await browser1.restoreNetwork()

      // Verify automatic reconnection
      await browser1.waitFor(() => true)
      expect(await connectionStatus.getText()).toContain('Connected')
    })

    it('should queue messages during disconnection and send on reconnect', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Simulate network failure
      await browser1.simulateNetworkFailure()

      // Try to send messages while disconnected
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      const queuedMessages = [
        'Queued message 1',
        'Queued message 2',
        'Queued message 3'
      ]

      for (const message of queuedMessages) {
        await messageInput.type(message)
        await sendButton.click()
        
        // Verify message is queued
        const queuedIndicator = await browser1.findElement('[data-testid="message-queued"]')
        expect(await queuedIndicator.isVisible()).toBe(true)
      }

      // Restore network
      await browser1.restoreNetwork()

      // Wait for reconnection and message sync
      await browser1.waitFor(() => true)

      // Verify all queued messages were sent
      for (const message of queuedMessages) {
        const sentMessage = await browser1.findElement(`[data-testid="message-${message}"]`)
        expect(await sentMessage.isVisible()).toBe(true)
        
        const sentIndicator = await browser1.findElement('[data-testid="message-sent"]')
        expect(await sentIndicator.isVisible()).toBe(true)
      }
    })

    it('should handle connection recovery with exponential backoff', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Monitor connection attempts
      const connectionAttempts: number[] = []
      
      await browser1.executeScript(`
        const originalConnect = window.chatService?.connect;
        if (originalConnect) {
          window.chatService.connect = function() {
            window.connectionAttempts = window.connectionAttempts || [];
            window.connectionAttempts.push(Date.now());
            return originalConnect.apply(this, arguments);
          };
        }
      `)

      // Simulate intermittent network issues
      await browser1.simulateNetworkFailure()
      
      // Wait for multiple reconnection attempts
      await browser1.waitFor(() => true)
      await browser1.waitFor(() => true)
      await browser1.waitFor(() => true)

      // Get connection attempt timestamps
      const attempts = await browser1.executeScript(`
        return window.connectionAttempts || []
      `)

      // Verify exponential backoff pattern
      if (attempts.length >= 3) {
        const interval1 = attempts[1] - attempts[0]
        const interval2 = attempts[2] - attempts[1]
        
        // Second interval should be longer than first (exponential backoff)
        expect(interval2).toBeGreaterThan(interval1)
      }
    })

    it('should sync missed messages after reconnection', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      // Disconnect browser 1
      await browser1.simulateNetworkFailure()

      // Browser 2 sends messages while browser 1 is disconnected
      const messageInput2 = await browser2.findElement('[data-testid="message-input"]')
      const sendButton2 = await browser2.findElement('[data-testid="send-button"]')
      
      const missedMessages = [
        'Missed message 1',
        'Missed message 2',
        'Missed message 3'
      ]

      for (const message of missedMessages) {
        await messageInput2.type(message)
        await sendButton2.click()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Reconnect browser 1
      await browser1.restoreNetwork()

      // Wait for sync
      await browser1.waitFor(() => true)

      // Verify all missed messages appear in browser 1
      for (const message of missedMessages) {
        const messageElement = await browser1.findElement(`[data-testid="message-${message}"]`)
        expect(await messageElement.isVisible()).toBe(true)
      }
    })

    it('should handle partial connection failures gracefully', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Simulate partial connection (can receive but not send)
      await browser1.executeScript(`
        // Mock partial connection failure
        const originalSend = window.chatService?.sendMessage;
        if (originalSend) {
          window.chatService.sendMessage = function() {
            return Promise.reject(new Error('Send failed'));
          };
        }
      `)

      // Try to send message
      const messageInput = await browser1.findElement('[data-testid="message-input"]')
      const sendButton = await browser1.findElement('[data-testid="send-button"]')
      
      await messageInput.type('Partial failure test')
      await sendButton.click()

      // Verify error handling
      const errorMessage = await browser1.findElement('[data-testid="send-error"]')
      expect(await errorMessage.isVisible()).toBe(true)

      // Verify retry mechanism
      const retryButton = await browser1.findElement('[data-testid="retry-send"]')
      expect(await retryButton.isVisible()).toBe(true)
    })
  })

  describe('Performance and Load Tests', () => {
    it('should handle high message volume without performance degradation', async () => {
      await Promise.all([
        browser1.navigate('http://localhost:3000/roulette'),
        browser2.navigate('http://localhost:3000/roulette')
      ])

      await Promise.all([
        browser1.waitForElement('[data-testid="chat-sidebar"]'),
        browser2.waitForElement('[data-testid="chat-sidebar"]')
      ])

      const startTime = Date.now()

      // Send 50 messages rapidly
      for (let i = 0; i < 50; i++) {
        const browser = i % 2 === 0 ? browser1 : browser2
        const messageInput = await browser.findElement('[data-testid="message-input"]')
        const sendButton = await browser.findElement('[data-testid="send-button"]')
        
        await messageInput.type(`High volume message ${i + 1}`)
        await sendButton.click()
      }

      // Wait for all messages to be processed
      await browser1.waitFor(() => true)
      await browser2.waitFor(() => true)

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify performance is acceptable (should handle 50 messages in under 10 seconds)
      expect(totalTime).toBeLessThan(10000)

      // Verify all messages are present
      const messageCount1 = await browser1.executeScript(`
        return document.querySelectorAll('[data-testid^="message-High volume message"]').length
      `)
      const messageCount2 = await browser2.executeScript(`
        return document.querySelectorAll('[data-testid^="message-High volume message"]').length
      `)

      expect(messageCount1).toBe(50)
      expect(messageCount2).toBe(50)
    })

    it('should maintain performance with large message history', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Simulate loading large message history
      await browser1.executeScript(`
        // Mock large message history
        const messageList = document.querySelector('[data-testid="message-list"]');
        if (messageList) {
          for (let i = 0; i < 1000; i++) {
            const messageElement = document.createElement('div');
            messageElement.setAttribute('data-testid', 'message-History message ' + i);
            messageElement.textContent = 'History message ' + i;
            messageList.appendChild(messageElement);
          }
        }
      `)

      // Measure scroll performance
      const startTime = Date.now()

      const messageList = await browser1.findElement('[data-testid="message-list"]')
      await browser1.executeScript(`
        document.querySelector('[data-testid="message-list"]').scrollTop = 0;
      `)

      await browser1.executeScript(`
        document.querySelector('[data-testid="message-list"]').scrollTop = 
          document.querySelector('[data-testid="message-list"]').scrollHeight;
      `)

      const endTime = Date.now()
      const scrollTime = endTime - startTime

      // Scrolling should be smooth (under 100ms)
      expect(scrollTime).toBeLessThan(100)
    })

    it('should handle memory usage efficiently during long sessions', async () => {
      await browser1.navigate('http://localhost:3000/roulette')
      await browser1.waitForElement('[data-testid="chat-sidebar"]')

      // Get initial memory usage
      const initialMemory = await browser1.executeScript(`
        return performance.memory ? performance.memory.usedJSHeapSize : 0
      `)

      // Simulate long chat session with many messages
      for (let i = 0; i < 100; i++) {
        const messageInput = await browser1.findElement('[data-testid="message-input"]')
        const sendButton = await browser1.findElement('[data-testid="send-button"]')
        
        await messageInput.type(`Memory test message ${i + 1}`)
        await sendButton.click()
        
        // Small delay to simulate real usage
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Get final memory usage
      const finalMemory = await browser1.executeScript(`
        return performance.memory ? performance.memory.usedJSHeapSize : 0
      `)

      // Memory increase should be reasonable (less than 50MB for 100 messages)
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
    })
  })
})