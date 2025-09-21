#!/usr/bin/env node

// Simple test to verify blackjack action endpoint works
async function testBlackjackAction() {
  const baseUrl = 'http://localhost:3000'
  
  // Test data from the frontend logs
  const testRequest = {
    gameId: "blackjack-1758476684395-c6e8eac9-9398-40f0-a366-07b521d8d433",
    action: "hit",
    handIndex: 0
  }
  
  try {
    console.log('Testing blackjack action endpoint...')
    console.log('Request data:', testRequest)
    
    const response = await fetch(`${baseUrl}/api/games/blackjack/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth, but should get past validation
      },
      body: JSON.stringify(testRequest)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseData = await response.json()
    console.log('Response data:', responseData)
    
    if (response.status === 401) {
      console.log('✅ Got 401 (auth required) - validation passed!')
    } else if (response.status === 400 && responseData.error?.message === 'Validation failed') {
      console.log('❌ Validation failed - gameId format issue')
    } else if (response.status === 500) {
      console.log('❌ Internal server error - something is broken')
    } else {
      console.log('🤔 Unexpected response')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Run the test
testBlackjackAction()