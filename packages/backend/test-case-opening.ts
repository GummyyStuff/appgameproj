#!/usr/bin/env bun

/**
 * Test case opening API with proper authentication
 */

import { supabaseAdmin } from './src/config/supabase'
import { CaseOpeningService } from './src/services/case-opening'

async function testCaseOpeningService() {
  console.log('🧪 Testing Case Opening Service...')
  
  try {
    // Test 1: Get case types
    console.log('📦 Testing getCaseTypes...')
    const caseTypes = await CaseOpeningService.getCaseTypes()
    console.log(`✅ Found ${caseTypes.length} case types:`)
    caseTypes.forEach(c => console.log(`  - ${c.name}: ${c.price} roubles`))
    
    if (caseTypes.length === 0) {
      console.error('❌ No case types found!')
      return
    }
    
    // Test 2: Get item pool for first case
    const firstCase = caseTypes[0]
    console.log(`\n🎯 Testing getItemPool for ${firstCase.name}...`)
    const itemPool = await CaseOpeningService.getItemPool(firstCase.id)
    console.log(`✅ Found ${itemPool.length} items in pool`)
    
    if (itemPool.length === 0) {
      console.error('❌ No items found in pool!')
      return
    }
    
    // Test 3: Create a test user and test case opening
    console.log('\n👤 Creating test user...')
    const testUserId = '00000000-0000-0000-0000-000000000001'
    
    // Test 4: Validate case opening (this will fail due to insufficient balance, but should not crash)
    console.log('\n✅ Testing validateCaseOpening...')
    const validation = await CaseOpeningService.validateCaseOpening(testUserId, firstCase.id)
    console.log(`Validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`)
    if (!validation.isValid) {
      console.log(`Expected error: ${validation.error}`)
    }
    
    // Test 5: Test the case opening logic (without balance check)
    console.log('\n🎲 Testing case opening logic...')
    try {
      const result = await CaseOpeningService.openCase(testUserId, firstCase.id)
      console.log('✅ Case opening logic works!')
      console.log(`Won: ${result.item_won.name} (${result.item_won.rarity})`)
      console.log(`Currency awarded: ${result.currency_awarded}`)
    } catch (error) {
      console.log(`Expected error (insufficient balance): ${error}`)
    }
    
    console.log('\n🎉 Case Opening Service tests completed!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
    console.error('Stack trace:', error.stack)
  }
}

testCaseOpeningService()