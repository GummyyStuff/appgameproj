/**
 * Validate Supabase JWT keys
 * Checks if the keys are valid JWT tokens
 */

function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format - should have 3 parts' }
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    return {
      valid: true,
      header,
      payload
    }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

function validateKeys() {
  console.log('🔐 Validating Supabase JWT Keys')
  console.log('===============================')
  console.log('')

  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!anonKey) {
    console.log('❌ SUPABASE_ANON_KEY is missing')
    return false
  }

  if (!serviceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY is missing')
    return false
  }

  console.log('🔍 Validating ANON key...')
  const anonResult = decodeJWT(anonKey)
  if (anonResult.valid) {
    console.log('✅ ANON key is valid JWT')
    console.log(`   Role: ${anonResult.payload.role}`)
    console.log(`   Issuer: ${anonResult.payload.iss}`)
    console.log(`   Expires: ${new Date(anonResult.payload.exp * 1000).toISOString()}`)
    
    if (anonResult.payload.role !== 'anon') {
      console.log('⚠️  Warning: Expected role "anon" but got:', anonResult.payload.role)
    }
  } else {
    console.log('❌ ANON key is invalid:', anonResult.error)
    return false
  }

  console.log('')
  console.log('🔍 Validating SERVICE_ROLE key...')
  const serviceResult = decodeJWT(serviceKey)
  if (serviceResult.valid) {
    console.log('✅ SERVICE_ROLE key is valid JWT')
    console.log(`   Role: ${serviceResult.payload.role}`)
    console.log(`   Issuer: ${serviceResult.payload.iss}`)
    console.log(`   Expires: ${new Date(serviceResult.payload.exp * 1000).toISOString()}`)
    
    if (serviceResult.payload.role !== 'service_role') {
      console.log('⚠️  Warning: Expected role "service_role" but got:', serviceResult.payload.role)
    }
  } else {
    console.log('❌ SERVICE_ROLE key is invalid:', serviceResult.error)
    return false
  }

  console.log('')
  
  // Check if both keys have the same issuer
  if (anonResult.valid && serviceResult.valid) {
    if (anonResult.payload.iss === serviceResult.payload.iss) {
      console.log('✅ Both keys have matching issuer:', anonResult.payload.iss)
    } else {
      console.log('⚠️  Keys have different issuers:')
      console.log(`   ANON: ${anonResult.payload.iss}`)
      console.log(`   SERVICE: ${serviceResult.payload.iss}`)
    }
  }

  console.log('')
  console.log('🎯 Key validation complete!')
  return true
}

validateKeys()