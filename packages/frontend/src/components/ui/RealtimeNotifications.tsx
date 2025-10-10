/**
 * Realtime Notifications Component (Simplified for Appwrite)
 * Displays real-time notifications for game events and balance updates
 * NOTE: Simplified for Appwrite migration - full realtime handled by other hooks
 */

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface NotificationItem {
  id: string
  type: string
  message: string
  isRead: boolean
}

interface RealtimeNotificationsProps {
  onBalanceUpdate?: (update: any) => void
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

  // Simplified for Appwrite - notifications are local only for now
  // Full realtime handled by useChatRealtime, useGameRealtime, usePresence hooks
  
  return null // Component disabled for now - can re-enable with Appwrite Realtime integration
}

export default RealtimeNotifications
