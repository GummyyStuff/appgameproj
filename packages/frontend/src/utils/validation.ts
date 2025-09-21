export interface ValidationResult {
  isValid: boolean
  error?: string
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: 'Username is required' }
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' }
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' }
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' }
  }
  
  return { isValid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' }
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' }
  }
  
  return { isValid: true }
}

export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' }
  }
  
  if (confirmPassword !== password) {
    return { isValid: false, error: 'Passwords do not match' }
  }
  
  return { isValid: true }
}

export const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong', score: number } => {
  let score = 0
  
  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  
  if (score <= 2) return { strength: 'weak', score }
  if (score <= 4) return { strength: 'medium', score }
  return { strength: 'strong', score }
}