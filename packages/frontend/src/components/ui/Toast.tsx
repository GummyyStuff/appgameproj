import React from 'react'
import { motion } from 'framer-motion'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { id, type, title, message, action } = toast

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-tarkov-success/20 border-tarkov-success',
          icon: '✅',
          iconColor: 'text-tarkov-success',
          textColor: 'text-tarkov-success'
        }
      case 'error':
        return {
          bg: 'bg-tarkov-danger/20 border-tarkov-danger',
          icon: '❌',
          iconColor: 'text-tarkov-danger',
          textColor: 'text-tarkov-danger'
        }
      case 'warning':
        return {
          bg: 'bg-tarkov-warning/20 border-tarkov-warning',
          icon: '⚠️',
          iconColor: 'text-tarkov-warning',
          textColor: 'text-tarkov-warning'
        }
      case 'info':
        return {
          bg: 'bg-tarkov-accent/20 border-tarkov-accent',
          icon: 'ℹ️',
          iconColor: 'text-tarkov-accent',
          textColor: 'text-tarkov-accent'
        }
    }
  }

  const styles = getToastStyles()

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      className={`${styles.bg} border rounded-lg p-4 shadow-lg max-w-sm min-w-80 backdrop-blur-sm`}
    >
      <div className="flex items-start space-x-3">
        <div className={`${styles.iconColor} text-xl flex-shrink-0`}>
          {styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${styles.textColor} font-medium text-sm`}>{title}</p>
          {message && (
            <p className="text-gray-300 text-xs mt-1">{message}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className={`${styles.textColor} text-xs underline hover:no-underline mt-2`}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className={`${styles.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}

export default Toast