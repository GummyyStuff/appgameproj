import React from 'react'
import { getPasswordStrength } from '../../utils/validation'

interface PasswordStrengthProps {
  password: string
  show?: boolean
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, show = true }) => {
  if (!show || !password) return null
  
  const { strength, score } = getPasswordStrength(password)
  
  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return 'text-tarkov-danger'
      case 'medium':
        return 'text-tarkov-warning'
      case 'strong':
        return 'text-tarkov-success'
      default:
        return 'text-gray-400'
    }
  }
  
  const getStrengthBgColor = () => {
    switch (strength) {
      case 'weak':
        return 'bg-tarkov-danger'
      case 'medium':
        return 'bg-tarkov-warning'
      case 'strong':
        return 'bg-tarkov-success'
      default:
        return 'bg-gray-400'
    }
  }
  
  const strengthPercentage = (score / 6) * 100

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Password Strength:</span>
        <span className={`text-xs font-medium capitalize ${getStrengthColor()}`}>
          {strength}
        </span>
      </div>
      
      <div className="w-full bg-tarkov-secondary rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthBgColor()}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>
      
      <div className="text-xs text-gray-400 space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center space-x-1 ${password.length >= 8 ? 'text-tarkov-success' : 'text-gray-500'}`}>
            <span>{password.length >= 8 ? '✓' : '○'}</span>
            <span>8+ characters</span>
          </div>
          <div className={`flex items-center space-x-1 ${/[a-z]/.test(password) ? 'text-tarkov-success' : 'text-gray-500'}`}>
            <span>{/[a-z]/.test(password) ? '✓' : '○'}</span>
            <span>Lowercase</span>
          </div>
          <div className={`flex items-center space-x-1 ${/[A-Z]/.test(password) ? 'text-tarkov-success' : 'text-gray-500'}`}>
            <span>{/[A-Z]/.test(password) ? '✓' : '○'}</span>
            <span>Uppercase</span>
          </div>
          <div className={`flex items-center space-x-1 ${/[0-9]/.test(password) ? 'text-tarkov-success' : 'text-gray-500'}`}>
            <span>{/[0-9]/.test(password) ? '✓' : '○'}</span>
            <span>Numbers</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordStrength