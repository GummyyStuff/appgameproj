#!/usr/bin/env bun

/**
 * Fix Game History Constraint Script
 * This script checks existing game types and fixes the constraint issue
 */

import { supabaseAdmin } from '../config/supabase'

async function checkExistingGameTypes(): Promise<void> {
  console.log('🔍 Checking existing game types in game_history table...')

  try {
    // Get all unique game types currently in the database
    const { data: gameTypes, error } = await supabaseAdmin
      .from('game_history')
      .select('game_type')

    if (error) {
      console.error('❌ Error querying game_history:', error.message)
      return
    }

    if (!gameTypes || gameTypes.length === 0) {
      console.log('✅ No existing game history records found')
      return
    }

    // Get unique game types
    const uniqueGameTypes = [...new Set(gameTypes.map(row => row.game_type))]
    console.log('📊 Found game types:', uniqueGameTypes)

    // Check which ones are invalid
    const validGameTypes = ['roulette', 'blackjack', 'case_opening']
    const invalidGameTypes = uniqueGameTypes.filter(type => !validGameTypes.includes(type))

    if (invalidGameTypes.length === 0) {
      console.log('✅ All game types are valid')
      return
    }

    console.log('❌ Invalid game types found:', invalidGameTypes)
    console.log('\n🔧 SQL to fix the data:')
    
    // Generate SQL to fix each invalid game type
    invalidGameTypes.forEach(invalidType => {
      console.log(`UPDATE game_history SET game_type = 'roulette' WHERE game_type = '${invalidType}';`)
    })

    console.log('\n📋 Complete fix SQL:')
    console.log(`-- Fix invalid game types
UPDATE game_history 
SET game_type = 'roulette' 
WHERE game_type NOT IN ('roulette', 'blackjack', 'case_opening');

-- Drop and recreate constraint
ALTER TABLE game_history 
DROP CONSTRAINT IF EXISTS game_history_game_type_check;

ALTER TABLE game_history 
ADD CONSTRAINT game_history_game_type_check 
CHECK (game_type IN ('roulette', 'blackjack', 'case_opening'));`)

  } catch (error) {
    console.error('💥 Error checking game types:', error)
  }
}

async function fixGameHistoryConstraint(): Promise<void> {
  console.log('🔧 Fixing game_history constraint...')

  try {
    // First, let's check what we're dealing with
    await checkExistingGameTypes()

    console.log('\n💡 To fix this issue:')
    console.log('1. Copy the SQL above')
    console.log('2. Execute it in your Supabase SQL editor')
    console.log('3. Then run the case opening setup again')

  } catch (error) {
    console.error('💥 Error during fix:', error)
  }
}

// Run the fix
if (require.main === module) {
  fixGameHistoryConstraint()
    .then(() => {
      console.log('\n✨ Fix instructions provided!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error)
      process.exit(1)
    })
}

export { fixGameHistoryConstraint }