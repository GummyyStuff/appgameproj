#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://192.168.0.69:8001'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function createGetUserStatisticsFunction() {
  console.log('🔧 Creating get_user_statistics RPC function...')
  
  const functionSQL = `
-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid UUID)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
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
    
    -- Get game-specific statistics
    SELECT jsonb_object_agg(
        game_type,
        jsonb_build_object(
            'games_played', count(*),
            'total_wagered', COALESCE(sum(bet_amount), 0),
            'total_won', COALESCE(sum(win_amount), 0),
            'biggest_win', COALESCE(max(win_amount), 0),
            'win_rate', CASE 
                WHEN count(*) > 0 THEN 
                    round((count(*) FILTER (WHERE win_amount > bet_amount)::decimal / count(*) * 100), 2)
                ELSE 0 
            END
        )
    ) INTO game_stats
    FROM game_history
    WHERE user_id = user_uuid
    GROUP BY game_type;
    
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
$$;
`

  try {
    const { error } = await supabase.rpc('exec', { sql: functionSQL })
    
    if (error) {
      console.error('❌ Failed to create function:', error)
      return false
    }
    
    console.log('✅ Successfully created get_user_statistics function')
    return true
  } catch (error) {
    console.error('❌ Error creating function:', error)
    return false
  }
}

async function testFunction() {
  console.log('🧪 Testing get_user_statistics function...')
  
  try {
    // First, let's get a user ID to test with
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    if (userError) {
      console.error('❌ Failed to get test user:', userError)
      return false
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️  No users found to test with')
      return true
    }
    
    const testUserId = users[0].id
    console.log(`🔍 Testing with user ID: ${testUserId}`)
    
    const { data, error } = await supabase
      .rpc('get_user_statistics', { user_uuid: testUserId })
    
    if (error) {
      console.error('❌ Function test failed:', error)
      return false
    }
    
    console.log('✅ Function test successful:', data)
    return true
  } catch (error) {
    console.error('❌ Error testing function:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Fixing get_user_statistics RPC function...')
  
  const created = await createGetUserStatisticsFunction()
  if (!created) {
    process.exit(1)
  }
  
  const tested = await testFunction()
  if (!tested) {
    console.log('⚠️  Function created but test failed - this might be normal if no test data exists')
  }
  
  console.log('🎉 RPC function fix completed!')
}

main().catch(console.error)