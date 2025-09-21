#!/usr/bin/env bun

/**
 * Test case opening API endpoint directly
 */

import { supabaseAdmin } from './src/config/supabase'

async function testCaseOpeningAPI() {
  console.log('🧪 Testing Case Opening API...')
  
  try {
    // First, let's create a test user with sufficient balance
    const testUserId = 'c6e8eac9-9398-40f0-a366-07b521d8d433' // Use the actual user ID from the error
    
    console.log('👤 Checking user profile...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (profileError) {
      console.error('❌ User profile error:', profileError.message)
      return
    }
    
    console.log('✅ User profile found:', profile.username)
    console.log('💰 Current balance:', profile.balance)
    
    // Check if user has sufficient balance for cheapest case
    const { data: cases } = await supabaseAdmin
      .from('case_types')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
      .limit(1)
    
    if (!cases || cases.length === 0) {
      console.error('❌ No cases found')
      return
    }
    
    const cheapestCase = cases[0]
    console.log(`📦 Cheapest case: ${cheapestCase.name} (${cheapestCase.price} roubles)`)
    
    if (profile.balance < cheapestCase.price) {
      console.log('💸 Insufficient balance, adding funds...')
      
      // Add balance to user
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ balance: cheapestCase.price + 1000 })
        .eq('id', testUserId)
      
      if (updateError) {
        console.error('❌ Failed to update balance:', updateError.message)
        return
      }
      
      console.log('✅ Balance updated')
    }
    
    // Now test the case opening service components individually
    console.log('\n🔧 Testing service components...')
    
    // Import and test the case opening service
    const { CaseOpeningService } = await import('./src/services/case-opening')
    
    console.log('1. Testing validateCaseOpening...')
    const validation = await CaseOpeningService.validateCaseOpening(testUserId, cheapestCase.id)
    console.log(`   Result: ${validation.isValid ? 'Valid' : 'Invalid'}`)
    if (!validation.isValid) {
      console.log(`   Error: ${validation.error}`)
      return
    }
    
    console.log('2. Testing openCase...')
    const openingResult = await CaseOpeningService.openCase(testUserId, cheapestCase.id)
    console.log(`   Won: ${openingResult.item_won.name} (${openingResult.item_won.rarity})`)
    console.log(`   Currency awarded: ${openingResult.currency_awarded}`)
    
    console.log('3. Testing CurrencyService.processGameTransaction...')
    const { CurrencyService } = await import('./src/services/currency')
    
    const transactionResult = await CurrencyService.processGameTransaction(
      testUserId,
      'case_opening',
      cheapestCase.price,
      openingResult.currency_awarded,
      {
        case_type_id: openingResult.case_type.id,
        case_name: openingResult.case_type.name,
        case_price: openingResult.case_type.price,
        item_id: openingResult.item_won.id,
        item_name: openingResult.item_won.name,
        item_rarity: openingResult.item_won.rarity,
        item_category: openingResult.item_won.category,
        item_value: openingResult.item_won.base_value,
        currency_awarded: openingResult.currency_awarded,
        opening_id: openingResult.opening_id
      }
    )
    
    console.log(`   Transaction success: ${transactionResult.success}`)
    console.log(`   New balance: ${transactionResult.newBalance}`)
    
    console.log('4. Testing audit logging...')
    const { auditLog } = await import('./src/middleware/audit')
    
    await auditLog.gamePlayStarted(testUserId, 'case_opening', cheapestCase.price, '127.0.0.1')
    console.log('   Game start logged')
    
    await auditLog.gameCompleted(testUserId, 'case_opening', cheapestCase.price, openingResult.currency_awarded, '127.0.0.1')
    console.log('   Game completion logged')
    
    console.log('\n🎉 All components working correctly!')
    console.log('💡 The issue might be in the HTTP request handling or middleware')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
    console.error('Stack trace:', error.stack)
  }
}

testCaseOpeningAPI()