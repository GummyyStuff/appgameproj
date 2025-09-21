import { useState, useCallback } from 'react'
import { Toast, ToastType } from '../components/ui/Toast'

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((
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
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = options?.duration ?? (type === 'error' ? 5000 : 3000)
    
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration,
      action: options?.action
    }

    setToasts(prev => [...prev, toast])

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('success', title, message, options)
  }, [addToast])

  const error = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('error', title, message, options)
  }, [addToast])

  const warning = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('warning', title, message, options)
  }, [addToast])

  const info = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('info', title, message, options)
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  }
}