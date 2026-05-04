'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from './store'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  Bell,
  Ticket,
  UserPlus,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  CheckCheck,
  Check,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  title: string
  message: string
  userId: string
  ticketId: string | null
  isRead: boolean
  createdAt: string
  ticket?: {
    id: string
    ticketId: string
    title: string
    status: string
  } | null
}

type FilterTab = 'all' | 'unread' | 'read'

// ─── Notification Type Icons ─────────────────────────────────────────────────

const NOTIFICATION_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  TICKET_CREATED: {
    icon: <Ticket className="h-4 w-4" />,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  },
  TICKET_ASSIGNED: {
    icon: <UserPlus className="h-4 w-4" />,
    color: 'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30',
  },
  STATUS_UPDATED: {
    icon: <RefreshCw className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  },
  NEW_REPLY: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  },
  SLA_WARNING: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  },
  SLA_BREACHED: {
    icon: <AlertOctagon className="h-4 w-4" />,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  },
}

function getNotificationIcon(type: string): { icon: React.ReactNode; color: string } {
  return NOTIFICATION_ICONS[type] || {
    icon: <Bell className="h-4 w-4" />,
    color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationsView() {
  const navigateToTicket = useAppStore((s) => s.navigateToTicket)

  // Data
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter
  const [filter, setFilter] = useState<FilterTab>('all')

  // Marking
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications?limit=50')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'read') return n.isRead
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Mark single as read
  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingId(notificationId)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      )
      toast.success('Marked as read')
    } catch {
      toast.error('Failed to mark as read')
    } finally {
      setMarkingId(null)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  // Click notification to navigate
  const handleClick = (notification: Notification) => {
    // Mark as read first
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    // Navigate to ticket if associated
    if (notification.ticketId) {
      navigateToTicket(notification.ticketId)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Bell className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'You\'re all caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1.5" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            All
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            Unread
            {unreadCount > 0 && (
              <Badge className="text-[10px] h-4 px-1.5 ml-1 bg-emerald-600 text-white">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="gap-1.5">
            Read
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {/* Error */}
          {error && (
            <Card className="border-destructive/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && <NotificationSkeleton />}

          {/* Empty State */}
          {!loading && !error && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {filter === 'unread'
                  ? 'You\'ve read all your notifications. Great job staying on top of things!'
                  : filter === 'read'
                    ? 'You haven\'t read any notifications yet.'
                    : 'We\'ll notify you when something important happens.'}
              </p>
            </div>
          )}

          {/* Notification List */}
          {!loading && !error && filteredNotifications.length > 0 && (
            <Card>
              <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                <div className="flex flex-col">
                  {filteredNotifications.map((notification, index) => {
                    const { icon, color } = getNotificationIcon(notification.type)
                    const isClickable = !!notification.ticketId

                    return (
                      <div key={notification.id}>
                        <div
                          className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                            isClickable ? 'cursor-pointer hover:bg-muted/50' : ''
                          } ${!notification.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}
                          onClick={() => handleClick(notification)}
                        >
                          {/* Type Icon */}
                          <div className={`flex items-center justify-center h-9 w-9 shrink-0 rounded-full ${color}`}>
                            {icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              {/* Unread indicator */}
                              {!notification.isRead && (
                                <span className="mt-1.5 shrink-0 block h-2 w-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground/70">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {notification.ticket && (
                                <>
                                  <span className="text-[10px] text-muted-foreground/50">·</span>
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">
                                    {notification.ticket.ticketId}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Mark as read button */}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              disabled={markingId === notification.id}
                            >
                              {markingId === notification.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span className="sr-only">Mark as read</span>
                            </Button>
                          )}
                        </div>
                        {index < filteredNotifications.length - 1 && <Separator />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
