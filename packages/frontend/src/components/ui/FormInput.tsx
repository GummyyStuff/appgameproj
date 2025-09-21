import React, { useState } from 'react'

interface FormInputProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  required?: boolean
  showPasswordToggle?: boolean
  className?: string
}

const FormInput: React.FC<FormInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  required = false,
  showPasswordToggle = false,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false)
  
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-tarkov-danger ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-3 py-2 bg-tarkov-secondary border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tarkov-accent focus:border-transparent transition-all duration-200 ${
            showPasswordToggle ? 'pr-10' : ''
          } ${
            error ? 'border-tarkov-danger' : 'border-tarkov-primary'
          }`}
        />
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-tarkov-danger text-sm animate-pulse flex items-center space-x-1">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export default FormInput