'use client';

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check, ExternalLink } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type?: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const notificationsRef = useRef<Notification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch and poll notifications
  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!cancelled && res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.notifications ?? [];
          if (!cancelled) {
            setNotifications(list.map((n: Record<string, unknown>) => ({
              id: n.id as string,
              title: n.title as string,
              message: n.message as string,
              createdAt: n.createdAt as string,
              read: n.isRead as boolean,
              type: n.type as string | undefined,
            })));
          }
        }
      } catch {
        // Silently fail - notifications are non-critical
      }
    };

    doFetch();
    const interval = setInterval(doFetch, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const markAllAsRead = async () => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Mark each unread notification as read on the server
    const unread = notificationsRef.current.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) =>
        fetch(`/api/notifications`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: n.id, markRead: true }),
        }).catch(() => {})
      )
    );
  };

  const handleViewAll = () => {
    setOpen(false);
    setCurrentView("notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold bg-emerald-600 text-white border-2 border-background p-0 flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            Notifications{unreadCount > 0 ? `, ${unreadCount} unread` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                We&apos;ll alert you when something arrives
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !notification.read ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="mt-1.5 shrink-0">
                      {!notification.read ? (
                        <span className="block h-2 w-2 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-snug truncate text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                size="sm"
                onClick={handleViewAll}
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
