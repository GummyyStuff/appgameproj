/**
 * Authentication Test Helper
 * 
 * This file provides utilities for testing the Appwrite authentication flow.
 * Use these functions in your browser console or test scripts.
 */

import { account } from '../lib/appwrite';

/**
 * Check if user is currently authenticated
 */
export async function checkAuthStatus() {
  try {
    const session = await account.getSession('current');
    const user = await account.get();
    
    console.log('✅ User is authenticated');
    console.log('Session:', {
      id: session.$id,
      expires: session.expire,
      provider: session.provider,
    });
    console.log('User:', {
      id: user.$id,
      name: user.name,
      email: user.email,
    });
    
    return { authenticated: true, session, user };
  } catch (error) {
    console.log('❌ User is not authenticated');
    console.error('Error:', error);
    return { authenticated: false, error };
  }
}

/**
 * Test session persistence
 */
export async function testSessionPersistence() {
  console.log('🧪 Testing session persistence...');
  
  const result1 = await checkAuthStatus();
  if (!result1.authenticated) {
    console.log('❌ No active session to test');
    return;
  }
  
  console.log('♻️ Refreshing page...');
  window.location.reload();
  
  // Note: This will reload the page, check console after reload
}

/**
 * List all active sessions
 */
export async function listAllSessions() {
  try {
    const sessions = await account.listSessions();
    console.log('📋 Active sessions:', sessions.total);
    sessions.sessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`, {
        id: session.$id,
        provider: session.provider,
        created: session.$createdAt,
        expires: session.expire,
        current: session.current,
      });
    });
    return sessions;
  } catch (error) {
    console.error('❌ Failed to list sessions:', error);
    return null;
  }
}

/**
 * Test logout functionality
 */
export async function testLogout() {
  console.log('🧪 Testing logout...');
  
  try {
    await account.deleteSession('current');
    console.log('✅ Logout successful');
    
    // Verify logout
    const status = await checkAuthStatus();
    if (!status.authenticated) {
      console.log('✅ Logout verified - no active session');
    } else {
      console.log('❌ Logout failed - session still active');
    }
  } catch (error) {
    console.error('❌ Logout failed:', error);
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences() {
  try {
    const prefs = await account.getPrefs();
    console.log('⚙️ User preferences:', prefs);
    return prefs;
  } catch (error) {
    console.error('❌ Failed to get preferences:', error);
    return null;
  }
}

/**
 * Run all auth tests
 */
export async function runAllAuthTests() {
  console.log('🧪 Running all authentication tests...\n');
  
  console.log('Test 1: Check Auth Status');
  await checkAuthStatus();
  
  console.log('\nTest 2: List All Sessions');
  await listAllSessions();
  
  console.log('\nTest 3: Get User Preferences');
  await getUserPreferences();
  
  console.log('\n✅ All tests complete');
  console.log('⚠️ To test logout, run: testLogout()');
  console.log('⚠️ To test session persistence, run: testSessionPersistence()');
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).authTests = {
    checkAuthStatus,
    testSessionPersistence,
    listAllSessions,
    testLogout,
    getUserPreferences,
    runAllAuthTests,
  };
  
  console.log('🧪 Auth test helpers loaded!');
  console.log('Available functions:');
  console.log('  - authTests.checkAuthStatus()');
  console.log('  - authTests.listAllSessions()');
  console.log('  - authTests.getUserPreferences()');
  console.log('  - authTests.testLogout()');
  console.log('  - authTests.testSessionPersistence()');
  console.log('  - authTests.runAllAuthTests()');
}

