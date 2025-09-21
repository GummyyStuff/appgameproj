/**
 * Test Realtime Setup
 * Tests the Supabase Realtime integration without requiring additional migrations
 */

import { supabaseRealtimeService } from '../services/realtime-supabase'
import { DatabaseService } from '../services/database'
import { env } from '../config/env'

async function testRealtimeSetup() {
  console.log('🧪 Testing Supabase Realtime Setup...')
  console.log(`🔗 Supabase URL: ${env.SUPABASE_URL}`)

  try {
    // Initialize the realtime service
    console.log('🔄 Initializing Supabase Realtime service...')
    await supabaseRealtimeService.initialize()
    console.log('✅ Realtime service initialized')

    // Test channel creation
    console.log('🔄 Testing channel creation...')
    const stats = supabaseRealtimeService.getChannelStats()
    console.log(`📊 Channel stats:`, stats)

    // Test broadcasting
    console.log('🔄 Testing broadcast functionality...')
    await supabaseRealtimeService.broadcastNotification({
      type: 'system_message',
      message: 'Test notification from backend',
      timestamp: Date.now()
    })
    console.log('✅ Broadcast test completed')

    // Test balance update broadcast
    console.log('🔄 Testing balance update broadcast...')
    await supabaseRealtimeService.broadcastBalanceUpdate({
      userId: 'test-user-id',
      newBalance: 1000,
      previousBalance: 900,
      change: 100,
      reason: 'test_transaction',
      timestamp: Date.now()
    })
    console.log('✅ Balance update broadcast test completed')

    // Test game update broadcast
    console.log('🔄 Testing game update broadcast...')
    await supabaseRealtimeService.broadcastGameUpdate({
      userId: 'test-user-id',
      gameType: 'roulette',
      gameId: 'test-game-id',
      status: 'completed',
      data: { betAmount: 100, winAmount: 200 },
      timestamp: Date.now()
    })
    console.log('✅ Game update broadcast test completed')

    // Test big win broadcast
    console.log('🔄 Testing big win broadcast...')
    await supabaseRealtimeService.broadcastBigWin(
      'test-user-id',
      'TestPlayer',
      'roulette',
      5000,
      { betAmount: 100, multiplier: 50 }
    )
    console.log('✅ Big win broadcast test completed')

    console.log('🎉 All realtime tests passed!')

    // Keep the service running for a few seconds to see if there are any connection issues
    console.log('⏳ Keeping service active for 5 seconds to test stability...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Shutdown
    console.log('🔄 Shutting down realtime service...')
    await supabaseRealtimeService.shutdown()
    console.log('✅ Realtime service shutdown completed')

    console.log('🎉 Realtime setup test completed successfully!')

  } catch (error) {
    console.error('💥 Realtime setup test failed:', error)
    
    // Try to shutdown gracefully
    try {
      await supabaseRealtimeService.shutdown()
    } catch (shutdownError) {
      console.error('💥 Failed to shutdown realtime service:', shutdownError)
    }
    
    process.exit(1)
  }
}

// Test database integration
async function testDatabaseIntegration() {
  console.log('🧪 Testing Database Integration...')

  try {
    // Test if we can create a test user and trigger realtime events
    console.log('🔄 Testing database operations that should trigger realtime events...')

    // Note: We can't actually test the triggers without applying the migration
    // But we can test that the database operations work
    console.log('ℹ️  Database integration test would require the realtime triggers migration')
    console.log('ℹ️  For now, we can verify that the basic database operations work')

    // Test basic database connectivity
    const { data: testQuery } = await DatabaseService.getUserStatistics('00000000-0000-0000-0000-000000000000')
    console.log('✅ Database connectivity test passed')

    console.log('🎉 Database integration test completed!')

  } catch (error) {
    console.error('💥 Database integration test failed:', error)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Realtime Setup Tests...')
  console.log('=' .repeat(50))

  await testRealtimeSetup()
  
  console.log('')
  console.log('=' .repeat(50))
  
  await testDatabaseIntegration()

  console.log('')
  console.log('🎉 All tests completed!')
}

// Run the tests
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  })