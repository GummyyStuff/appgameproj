#!/usr/bin/env bun

import { readFileSync } from 'fs'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

async function applyFixDirectly() {
  console.log('🔧 Applying SQL fix directly via REST API...')
  
  // The fixed SQL function
  const fixedSQL = `
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $function$
DECLARE
    user_stats RECORD;
    game_stats JSONB;
BEGIN
    -- Get basic user statistics
    SELECT 
        balance,
        total_wagered,
        total_won,
        games_played,
        created_at,
        last_daily_bonus
    INTO user_stats
    FROM user_profiles
    WHERE id = user_uuid;
    
    IF user_stats IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Get game-specific statistics (fixed nested aggregate issue)
    SELECT jsonb_object_agg(
        game_type,
        jsonb_build_object(
            'games_played', game_count,
            'total_wagered', COALESCE(total_wagered, 0),
            'total_won', COALESCE(total_won, 0),
            'biggest_win', COALESCE(biggest_win, 0),
            'win_rate', CASE 
                WHEN game_count > 0 THEN 
                    round((wins::decimal / game_count * 100), 2)
                ELSE 0 
            END
        )
    ) INTO game_stats
    FROM (
        SELECT 
            game_type,
            count(*) as game_count,
            sum(bet_amount) as total_wagered,
            sum(win_amount) as total_won,
            max(win_amount) as biggest_win,
            count(*) FILTER (WHERE win_amount > bet_amount) as wins
        FROM game_history
        WHERE user_id = user_uuid
        GROUP BY game_type
    ) game_summary;
    
    -- Return combined statistics
    RETURN jsonb_build_object(
        'success', true,
        'balance', user_stats.balance,
        'total_wagered', user_stats.total_wagered,
        'total_won', user_stats.total_won,
        'games_played', user_stats.games_played,
        'net_profit', (user_stats.total_won - user_stats.total_wagered),
        'member_since', user_stats.created_at,
        'last_daily_bonus', user_stats.last_daily_bonus,
        'can_claim_bonus', (user_stats.last_daily_bonus IS NULL OR user_stats.last_daily_bonus < CURRENT_DATE),
        'game_statistics', COALESCE(game_stats, '{}'::jsonb)
    );
END;
$function$;
`

  try {
    // Try to execute via the SQL editor endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ query: fixedSQL })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to apply fix via query endpoint:', response.status, error)
      return false
    }
    
    console.log('✅ Successfully applied SQL fix')
    return true
  } catch (error) {
    console.error('❌ Error applying fix:', error)
    return false
  }
}

async function testFixedFunction() {
  console.log('🧪 Testing fixed get_user_statistics function...')
  
  try {
    // Get a real user
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    })
    
    if (!usersResponse.ok) {
      console.error('❌ Failed to get users:', await usersResponse.text())
      return false
    }
    
    const users = await usersResponse.json()
    if (!users || users.length === 0) {
      console.log('⚠️  No users found to test with')
      return true
    }
    
    const testUserId = users[0].id
    console.log(`🔍 Testing with user ID: ${testUserId}`)
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_statistics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ user_uuid: testUserId })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Function test failed:', response.status, error)
      return false
    }
    
    const data = await response.json()
    console.log('✅ Function test successful!')
    console.log('📊 Sample data:', JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('❌ Error testing function:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Applying fix for get_user_statistics function...')
  
  const applied = await applyFixDirectly()
  if (!applied) {
    console.log('❌ Could not apply fix automatically.')
    console.log('💡 Manual fix required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Open the SQL Editor')
    console.log('3. Copy and paste the SQL from: packages/backend/src/scripts/fix-user-stats-function.sql')
    console.log('4. Execute the SQL')
    process.exit(1)
  }
  
  const tested = await testFixedFunction()
  if (tested) {
    console.log('🎉 Fix applied and tested successfully!')
  } else {
    console.log('⚠️  Fix applied but test failed - check the logs above')
  }
}

main().catch(console.error)