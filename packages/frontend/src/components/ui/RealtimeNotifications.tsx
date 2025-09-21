/**
 * Realtime Notifications Component
 * Displays real-time notifications for game events, balance updates, and big wins
 */

import { useState } from 'react'
import { useSupabaseRealtime, GameNotification, BalanceUpdate } from '../../hooks/useSupabaseRealtime'
import { useAuth } from '../../hooks/useAuth'

interface NotificationItem extends GameNotification {
  id: string
  isRead: boolean
}

interface RealtimeNotificationsProps {
  onBalanceUpdate?: (update: BalanceUpdate) => void
  showBigWins?: boolean
  maxNotifications?: number
}

export function RealtimeNotifications({
  onBalanceUpdate,
  showBigWins = true,
  maxNotifications = 5
}: RealtimeNotificationsProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Handle real-time events
  const { isConnected } = useSupabaseRealtime({
    onNotification: (notification) => {
      // Add notification to list
      const notificationItem: NotificationItem = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        isRead: false
      }

      setNotifications(prev => {
        const updated = [notificationItem, ...prev].slice(0, maxNotifications)
        return updated
      })

      // Show notification popup for important events
      if (notification.type === 'big_win' || notification.type === 'system_message') {
        setIsVisible(true)
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setIsVisible(false)
        }, 5000)
      }
    },
    onBalanceUpdate: (update) => {
      if (onBalanceUpdate) {
        onBalanceUpdate(update)
      }

      // Show balance update notification
      const notification: NotificationItem = {
        type: 'balance_update',
        message: `Balance ${update.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(update.change)} coins`,
        data: update,
        timestamp: update.timestamp,
        id: `balance-${Date.now()}`,
        isRead: false
      }

      setNotifications(prev => [notification, ...prev].slice(0, maxNotifications))
    },
    onBigWin: (data) => {
      if (!showBigWins) return

      // Create big win notification
      const notification: NotificationItem = {
        type: 'big_win',
        message: `🎉 ${data.username} won ${data.winAmount} coins on ${data.gameType}!`,
        data,
        timestamp: Date.now(),
        id: `bigwin-${Date.now()}`,
        isRead: false
      }

      setNotifications(prev => [notification, ...prev].slice(0, maxNotifications))
      setIsVisible(true)

      // Auto-hide after 7 seconds for big wins
      setTimeout(() => {
        setIsVisible(false)
      }, 7000)
    }
  })

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    )
  }

  // Clear all notifications
  const clearAll = () => {
    setNotifications([])
    setIsVisible(false)
  }

  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'big_win':
        return '🎉'
      case 'balance_update':
        return '💰'
      case 'game_complete':
        return '🎮'
      case 'system_message':
        return '📢'
      default:
        return '🔔'
    }
  }

  // Get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'big_win':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100'
      case 'balance_update':
        return 'bg-green-500/20 border-green-500/50 text-green-100'
      case 'game_complete':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-100'
      case 'system_message':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-100'
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-100'
    }
  }

  if (!user) return null

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="relative p-2 text-gray-300 hover:text-white transition-colors"
          title="Notifications"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* Connection status indicator */}
          <span
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </button>

        {/* Notifications Dropdown */}
        {isVisible && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead ? 'bg-gray-700/30' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Connection Status */}
            <div className="p-3 border-t border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Real-time updates</span>
                <span className={`flex items-center space-x-1 ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications for Important Events */}
      {notifications
        .filter(n => !n.isRead && (n.type === 'big_win' || n.type === 'system_message'))
        .slice(0, 3)
        .map((notification, index) => (
          <div
            key={notification.id}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg transform transition-all duration-300 ${
              getNotificationColor(notification.type)
            }`}
            style={{ top: `${1 + index * 5}rem` }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
                {notification.data && notification.type === 'big_win' && (
                  <p className="text-sm opacity-80 mt-1">
                    Game: {notification.data.gameType} • Win: {notification.data.winAmount} coins
                  </p>
                )}
              </div>
              <button
                onClick={() => markAsRead(notification.id)}
                className="text-current opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
    </>
  )
}

export default RealtimeNotifications