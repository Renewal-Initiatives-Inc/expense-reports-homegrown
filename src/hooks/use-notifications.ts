'use client'

import type { Notification, NotificationsResponse } from '@/types/notifications'
import { useCallback, useEffect, useState } from 'react'

const POLL_INTERVAL = 30000 // 30 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      const data: NotificationsResponse = await response.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setError(null)
    } catch {
      setError('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }
      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Poll for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}
