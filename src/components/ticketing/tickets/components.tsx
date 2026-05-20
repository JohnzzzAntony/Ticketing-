import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Priority, TicketStatus, TicketUser } from "./types"

const priorityBadgeClass: Record<Priority, string> = {
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  URGENT: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const statusBadgeClass: Record<TicketStatus, string> = {
  NEW: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  OPEN: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  PENDING_CUSTOMER: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  PENDING_INTERNAL: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  ESCALATED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
}

const statusLabels: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  PENDING_CUSTOMER: "Pending Customer",
  PENDING_INTERNAL: "Pending Internal",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={priorityBadgeClass[priority]}>
      {priorityLabels[priority]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={statusBadgeClass[status]}>
      {statusLabels[status]}
    </Badge>
  )
}

export function UserAvatar({ user, size = "sm" }: { user: TicketUser | null; size?: "sm" | "md" }) {
  if (!user) {
    return (
      <Avatar className={size === "sm" ? "h-6 w-6" : "h-8 w-8"}>
        <AvatarFallback className="text-xs bg-muted text-muted-foreground">?</AvatarFallback>
      </Avatar>
    )
  }
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return (
    <Avatar className={size === "sm" ? "h-6 w-6" : "h-8 w-8"}>
      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
      <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-8 w-28" />
          {Array.from({ length: 2 }).map((_, j) => (
            <Card key={j} className="animate-pulse">
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Ticket, AlertCircle, Building2 } from "lucide-react"

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Ticket className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No tickets found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "No tickets match your current filters. Try adjusting or clearing them."
          : "There are no tickets yet. Create one to get started."}
      </p>
    </div>
  )
}

export function BoardCard({ ticket, onClick }: { ticket: any; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 group"
      style={{
        borderLeftColor:
          ticket.priority === "URGENT"
            ? "rgb(239 68 68)"
            : ticket.priority === "HIGH"
              ? "rgb(249 115 22)"
              : ticket.priority === "MEDIUM"
                ? "rgb(245 158 11)"
                : "rgb(16 185 129)",
      }}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">{ticket.ticketId}</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {ticket.title}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{ticket.category.name}</span>
          <UserAvatar user={ticket.assignee} />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{ticket.department.code}</span>
        </div>
        {ticket.sla?.isBreached && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span className="text-xs font-medium">SLA Breached</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
