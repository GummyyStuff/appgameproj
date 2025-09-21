#!/usr/bin/env bun

/**
 * Check if case opening tables exist
 */

import { supabaseAdmin } from './src/config/supabase'

async function checkTables() {
  console.log('🔍 Checking case opening tables...')
  
  try {
    // Try to query each table
    const { data: caseTypes, error: caseError } = await supabaseAdmin
      .from('case_types')
      .select('id')
      .limit(1)
    
    if (caseError) {
      console.log('❌ case_types table:', caseError.message)
    } else {
      console.log('✅ case_types table exists')
    }
    
    const { data: items, error: itemError } = await supabaseAdmin
      .from('tarkov_items')
      .select('id')
      .limit(1)
    
    if (itemError) {
      console.log('❌ tarkov_items table:', itemError.message)
    } else {
      console.log('✅ tarkov_items table exists')
    }
    
    const { data: pools, error: poolError } = await supabaseAdmin
      .from('case_item_pools')
      .select('id')
      .limit(1)
    
    if (poolError) {
      console.log('❌ case_item_pools table:', poolError.message)
    } else {
      console.log('✅ case_item_pools table exists')
    }
    
    // If all tables exist, check if they have data
    if (!caseError && !itemError && !poolError) {
      console.log('📊 Checking data...')
      
      const { data: cases } = await supabaseAdmin
        .from('case_types')
        .select('*')
      
      const { data: itemsData } = await supabaseAdmin
        .from('tarkov_items')
        .select('*')
      
      const { data: poolsData } = await supabaseAdmin
        .from('case_item_pools')
        .select('*')
      
      console.log(`📦 Case types: ${cases?.length || 0}`)
      console.log(`🎯 Items: ${itemsData?.length || 0}`)
      console.log(`🔗 Item pools: ${poolsData?.length || 0}`)
      
      if (cases && cases.length > 0) {
        console.log('🎮 Available cases:')
        cases.forEach(c => console.log(`  - ${c.name}: ${c.price} roubles`))
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

checkTables()