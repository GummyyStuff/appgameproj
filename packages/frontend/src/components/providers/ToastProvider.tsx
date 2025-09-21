import React, { createContext, useContext } from 'react'
import { useToast } from '../../hooks/useToast'
import ToastContainer from '../ui/ToastContainer'
import { ToastType } from '../ui/Toast'

interface ToastContextType {
  success: (title: string, message?: string, options?: { duration?: number }) => string
  error: (title: string, message?: string, options?: { duration?: number }) => string
  warning: (title: string, message?: string, options?: { duration?: number }) => string
  info: (title: string, message?: string, options?: { duration?: number }) => string
  addToast: (
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number
      action?: {
        label: string
        onClick: () => void
      }
    }
  ) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
}

const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useToast()

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </ToastContext.Provider>
  )
}

export default ToastProvider