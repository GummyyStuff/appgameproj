import React from 'react'

interface SuccessMessageProps {
  message: string
  show: boolean
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  show,
  onClose,
  autoClose = true,
  duration = 3000,
}) => {
  React.useEffect(() => {
    if (show && autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, onClose, duration])

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-tarkov-success bg-opacity-20 border border-tarkov-success rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center space-x-3">
          <div className="text-tarkov-success text-2xl">✅</div>
          <div className="flex-1">
            <p className="text-tarkov-success font-medium">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-tarkov-success hover:text-green-400 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SuccessMessage