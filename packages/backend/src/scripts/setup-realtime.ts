#!/usr/bin/env bun

import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

async function enableRealtimeForTables() {
  console.log('🔧 Enabling realtime for tables...')
  
  const tables = ['user_profiles', 'game_history', 'daily_bonuses']
  
  for (const table of tables) {
    try {
      console.log(`📡 Enabling realtime for ${table}...`)
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/enable_realtime_for_table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ table_name: table })
      })
      
      if (response.ok) {
        console.log(`✅ Realtime enabled for ${table}`)
      } else {
        console.log(`⚠️  Could not enable realtime for ${table} (might already be enabled)`)
      }
    } catch (error) {
      console.log(`⚠️  Error enabling realtime for ${table}:`, error)
    }
  }
}

async function checkRealtimeStatus() {
  console.log('🔍 Checking realtime status...')
  
  try {
    // Try to get realtime info
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_realtime_channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({})
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('📊 Realtime status:', data)
    } else {
      console.log('⚠️  Could not get realtime status')
    }
  } catch (error) {
    console.log('⚠️  Error checking realtime status:', error)
  }
}

async function testRealtimeConnection() {
  console.log('🧪 Testing realtime connection...')
  
  try {
    // Test WebSocket connection
    const wsUrl = SUPABASE_URL.replace('http', 'ws') + '/realtime/v1/websocket'
    console.log(`🔌 WebSocket URL: ${wsUrl}`)
    
    // For now, just log the URL since we can't easily test WebSocket in Node.js
    console.log('💡 To test realtime:')
    console.log('1. Open your browser developer tools')
    console.log('2. Go to Network tab')
    console.log('3. Filter by WS (WebSocket)')
    console.log('4. Refresh your frontend application')
    console.log('5. Look for WebSocket connections to /realtime/v1/websocket')
    
  } catch (error) {
    console.error('❌ Error testing realtime connection:', error)
  }
}

async function createSimpleRealtimeSetup() {
  console.log('🔧 Creating simple realtime setup...')
  
  // Simple SQL to enable realtime publications
  const realtimeSQL = `
-- Enable realtime for tables
DO $$
BEGIN
    -- Create publication if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Add tables to publication (ignore errors if already added)
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already exists
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE game_history;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already exists
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE daily_bonuses;
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Ignore if already exists
    END;
END $$;

-- Grant necessary permissions
GRANT SELECT ON user_profiles TO anon, authenticated;
GRANT SELECT ON game_history TO anon, authenticated;
GRANT SELECT ON daily_bonuses TO anon, authenticated;
`

  console.log('📝 SQL to enable realtime:')
  console.log(realtimeSQL)
  console.log('')
  console.log('💡 To apply this:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Open the SQL Editor')
  console.log('3. Copy and paste the SQL above')
  console.log('4. Execute the SQL')
}

async function main() {
  console.log('🚀 Setting up Supabase Realtime...')
  
  await checkRealtimeStatus()
  await enableRealtimeForTables()
  await testRealtimeConnection()
  await createSimpleRealtimeSetup()
  
  console.log('')
  console.log('🎉 Realtime setup completed!')
  console.log('')
  console.log('📋 Next steps:')
  console.log('1. Apply the SQL shown above in your Supabase dashboard')
  console.log('2. Restart your frontend application')
  console.log('3. Check browser console for realtime connection status')
}

main().catch(console.error)