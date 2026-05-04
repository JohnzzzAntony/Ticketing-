'use client'

import { useState, useEffect, useCallback } from "react"
import { useAppStore } from "./store"
import { formatDistanceToNow, format } from "date-fns"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import {
  ArrowLeft,
  ChevronDown,
  Clock,
  User,
  Tag,
  AlertTriangle,
  MessageSquare,
  StickyNote,
  Activity,
  Send,
  Download,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  RefreshCw,
  XCircle,
  PlayCircle,
  PauseCircle,
  Eye,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED"
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

interface TicketUser {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  departmentId?: string | null
}

interface Reply {
  id: string
  content: string
  ticketId: string
  authorId: string
  author: TicketUser
  createdAt: string
  updatedAt: string
}

interface InternalNote {
  id: string
  content: string
  ticketId: string
  authorId: string
  author: TicketUser
  createdAt: string
  updatedAt: string
}

interface ActivityLogEntry {
  id: string
  action: string
  details: string | null
  ticketId: string
  userId: string
  user: TicketUser
  createdAt: string
}

interface SLARecord {
  id: string
  ticketId: string
  responseDeadline: string
  resolutionDeadline: string
  firstResponseAt: string | null
  resolvedAt: string | null
  isBreached: boolean
  createdAt: string
  updatedAt: string
}

interface TicketDetail {
  id: string
  ticketId: string
  title: string
  description: string
  category: string
  priority: Priority
  status: TicketStatus
  tags: string
  creatorId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  creator: TicketUser
  assignee: TicketUser | null
  replies: Reply[]
  internalNotes: InternalNote[]
  attachments: { id: string; filename: string; url: string; fileType: string; fileSize: number; createdAt: string }[]
  sla: SLARecord | null
  activityLogs: ActivityLogEntry[]
}

interface Agent {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
}

// ─── Badge Color Helpers ─────────────────────────────────────────────────────

const priorityBadgeClass: Record<Priority, string> = {
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  URGENT: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const statusBadgeClass: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  WAITING: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
}

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
}

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

// ─── Status Workflow ─────────────────────────────────────────────────────────

const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "CLOSED"],
  WAITING: ["IN_PROGRESS", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
}

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  OPEN: <Circle className="h-3.5 w-3.5" />,
  IN_PROGRESS: <PlayCircle className="h-3.5 w-3.5" />,
  WAITING: <PauseCircle className="h-3.5 w-3.5" />,
  RESOLVED: <CheckCircle2 className="h-3.5 w-3.5" />,
  CLOSED: <XCircle className="h-3.5 w-3.5" />,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function UserAvatar({ user, size = "sm" }: { user: TicketUser | null; size?: "sm" | "md" | "lg" }) {
  if (!user) {
    return (
      <Avatar className={size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10"}>
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
  const sizeClass = size === "sm" ? "h-6 w-6" : size === "md" ? "h-8 w-8" : "h-10 w-10"
  return (
    <Avatar className={sizeClass}>
      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
      <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function getActivityIcon(action: string) {
  switch (action) {
    case "TICKET_CREATED":
      return <Circle className="h-3.5 w-3.5 text-blue-500" />
    case "STATUS_CHANGED":
      return <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
    case "TICKET_ASSIGNED":
      return <UserPlus className="h-3.5 w-3.5 text-purple-500" />
    case "REPLY_ADDED":
      return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
    case "INTERNAL_NOTE_ADDED":
      return <StickyNote className="h-3.5 w-3.5 text-orange-500" />
    default:
      return <Activity className="h-3.5 w-3.5 text-gray-500" />
  }
}

function SLAProgressBar({ sla }: { sla: SLARecord }) {
  const now = new Date()
  const responseDeadline = new Date(sla.responseDeadline)
  const resolutionDeadline = new Date(sla.resolutionDeadline)

  // Response progress
  const responseCreated = new Date(sla.createdAt)
  const responseTotalMs = responseDeadline.getTime() - responseCreated.getTime()
  const responseElapsedMs = (sla.firstResponseAt ? new Date(sla.firstResponseAt) : now).getTime() - responseCreated.getTime()
  const responseProgress = Math.min(100, Math.max(0, (responseElapsedMs / responseTotalMs) * 100))
  const responseBreached = responseDeadline < now && !sla.firstResponseAt

  // Resolution progress
  const resolutionElapsedMs = (sla.resolvedAt ? new Date(sla.resolvedAt) : now).getTime() - responseCreated.getTime()
  const resolutionTotalMs = resolutionDeadline.getTime() - responseCreated.getTime()
  const resolutionProgress = Math.min(100, Math.max(0, (resolutionElapsedMs / resolutionTotalMs) * 100))
  const resolutionBreached = resolutionDeadline < now && !sla.resolvedAt

  const getColor = (progress: number, breached: boolean) => {
    if (breached || sla.isBreached) return "bg-red-500"
    if (progress > 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">First Response</span>
          <span className={responseBreached ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>
            {sla.firstResponseAt
              ? `Responded ${formatDistanceToNow(new Date(sla.firstResponseAt), { addSuffix: true })}`
              : responseBreached
                ? "Breached!"
                : `Due ${formatDistanceToNow(responseDeadline, { addSuffix: true })}`}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getColor(responseProgress, responseBreached)}`}
            style={{ width: `${responseProgress}%` }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Resolution</span>
          <span className={resolutionBreached ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>
            {sla.resolvedAt
              ? `Resolved ${formatDistanceToNow(new Date(sla.resolvedAt), { addSuffix: true })}`
              : resolutionBreached
                ? "Breached!"
                : `Due ${formatDistanceToNow(resolutionDeadline, { addSuffix: true })}`}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${getColor(resolutionProgress, resolutionBreached)}`}
            style={{ width: `${resolutionProgress}%` }}
          />
        </div>
      </div>
      {sla.isBreached && (
        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-2 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">SLA has been breached</span>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TicketDetail() {
  const { selectedTicketId, setCurrentView, user } = useAppStore()
  const isAdminOrAgent = user?.role === "ADMIN" || user?.role === "AGENT"

  // Data
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Forms
  const [replyContent, setReplyContent] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [submittingNote, setSubmittingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Agents for assignment
  const [agents, setAgents] = useState<Agent[]>([])

  // Fetch ticket
  const fetchTicket = useCallback(async () => {
    if (!selectedTicketId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}`)
      if (!res.ok) throw new Error("Failed to fetch ticket")
      const data = await res.json()
      setTicket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket")
    } finally {
      setLoading(false)
    }
  }, [selectedTicketId])

  // Fetch agents for assignment
  useEffect(() => {
    if (!isAdminOrAgent) return
    async function fetchAgents() {
      try {
        const res = await fetch("/api/users?role=AGENT&limit=50")
        if (res.ok) {
          const data = await res.json()
          // Also include admins
          const resAdmins = await fetch("/api/users?role=ADMIN&limit=50")
          const adminData = resAdmins.ok ? await resAdmins.json() : { users: [] }
          const allAgents = [
            ...(data.users || []),
            ...(adminData.users || []),
          ]
          // Deduplicate by id
          const unique = allAgents.filter(
            (a: Agent, i: number, arr: Agent[]) => arr.findIndex((b: Agent) => b.id === a.id) === i
          )
          setAgents(unique)
        }
      } catch {
        // Silently fail
      }
    }
    fetchAgents()
  }, [isAdminOrAgent])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  // ── Actions ──────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      await fetchTicket()
    } catch {
      // Could show toast here
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePriorityChange = async (newPriority: Priority) => {
    if (!ticket) return
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!res.ok) throw new Error("Failed to update priority")
      await fetchTicket()
    } catch {
      // Could show toast
    }
  }

  const handleAssignTicket = async (assigneeId: string) => {
    if (!ticket) return
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      })
      if (!res.ok) throw new Error("Failed to assign ticket")
      await fetchTicket()
    } catch {
      // Could show toast
    }
  }

  const handleAutoAssign = async () => {
    if (!ticket) return
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Failed to auto-assign ticket")
      await fetchTicket()
    } catch {
      // Could show toast
    }
  }

  const handleSubmitReply = async () => {
    if (!ticket || !replyContent.trim() || submittingReply) return
    setSubmittingReply(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim() }),
      })
      if (!res.ok) throw new Error("Failed to add reply")
      setReplyContent("")
      await fetchTicket()
    } catch {
      // Could show toast
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleSubmitNote = async () => {
    if (!ticket || !noteContent.trim() || submittingNote) return
    setSubmittingNote(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      })
      if (!res.ok) throw new Error("Failed to add note")
      setNoteContent("")
      await fetchTicket()
    } catch {
      // Could show toast
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleExport = async () => {
    if (!ticket) return
    try {
      const res = await fetch(`/api/export?ticketId=${ticket.id}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${ticket.ticketId}-export.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      // Could show toast
    }
  }

  const handleBack = () => {
    setCurrentView("tickets")
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (!selectedTicketId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No ticket selected</p>
      </div>
    )
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">{error || "Ticket not found"}</p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tickets
        </Button>
      </div>
    )
  }

  const tagsList = ticket.tags
    ? ticket.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-1">
        {/* Top row: back + ticket id + actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-mono text-muted-foreground">{ticket.ticketId}</span>
          <div className="ml-auto flex items-center gap-2">
            {isAdminOrAgent && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight flex-1">{ticket.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status dropdown */}
            {isAdminOrAgent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={updatingStatus}
                  >
                    {statusIcons[ticket.status]}
                    <span>{statusLabels[ticket.status]}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusTransitions[ticket.status].map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="gap-2"
                    >
                      {statusIcons[s]}
                      {statusLabels[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline" className={statusBadgeClass[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
            )}

            {/* Priority dropdown */}
            {isAdminOrAgent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Badge variant="outline" className={`${priorityBadgeClass[ticket.priority]} border-0 px-1.5 py-0`}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as Priority[]).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      onClick={() => handlePriorityChange(p)}
                      className="gap-2"
                    >
                      <Badge variant="outline" className={`${priorityBadgeClass[p]} border-0 px-1.5 py-0 text-xs`}>
                        {priorityLabels[p]}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline" className={priorityBadgeClass[ticket.priority]}>
                {priorityLabels[ticket.priority]}
              </Badge>
            )}

            {/* Assignee */}
            <div className="flex items-center gap-1.5">
              <UserAvatar user={ticket.assignee} size="sm" />
              <span className="text-sm">
                {ticket.assignee?.name || (
                  <span className="text-muted-foreground italic">Unassigned</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Created {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            by {ticket.creator.name}
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* ── Left Column (2/3) ─────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{ticket.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Replies
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {ticket.replies.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1 max-h-96 pr-3">
                {ticket.replies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No replies yet. Be the first to respond!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticket.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <UserAvatar user={reply.author} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{reply.author.name}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {reply.author.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{reply.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Reply form */}
              <div className="mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                  disabled={submittingReply}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || submittingReply}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {submittingReply ? "Sending..." : "Reply"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column (1/3) ────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-sm font-medium">{ticket.category}</span>
              </div>
              <Separator />
              {/* Priority */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Priority</span>
                <Badge variant="outline" className={priorityBadgeClass[ticket.priority]}>
                  {priorityLabels[ticket.priority]}
                </Badge>
              </div>
              <Separator />
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" className={statusBadgeClass[ticket.status]}>
                  {statusLabels[ticket.status]}
                </Badge>
              </div>
              <Separator />
              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Assignee</span>
                <div className="flex items-center gap-2">
                  <UserAvatar user={ticket.assignee} size="sm" />
                  {isAdminOrAgent ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-sm font-medium hover:bg-transparent">
                          {ticket.assignee?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                          <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {agents.map((agent) => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => handleAssignTicket(agent.id)}
                            className="gap-2"
                          >
                            <UserAvatar user={agent} size="sm" />
                            <span>{agent.name}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleAutoAssign} className="gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                          Auto-assign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-sm">
                      {ticket.assignee?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                    </span>
                  )}
                </div>
              </div>
              <Separator />
              {/* Creator */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Creator</span>
                <div className="flex items-center gap-2">
                  <UserAvatar user={ticket.creator} size="sm" />
                  <span className="text-sm">{ticket.creator.name}</span>
                </div>
              </div>

              {/* Tags */}
              {tagsList.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-muted-foreground shrink-0 pt-0.5">Tags</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {tagsList.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* SLA */}
              {ticket.sla && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">SLA Status</span>
                    </div>
                    <SLAProgressBar sla={ticket.sla} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes (agent/admin only) */}
          {isAdminOrAgent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Internal Notes
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {ticket.internalNotes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64 pr-3">
                  {ticket.internalNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No internal notes yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {ticket.internalNotes.map((note) => (
                        <div key={note.id} className="rounded-lg border bg-orange-50/50 dark:bg-orange-900/10 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <UserAvatar user={note.author} size="sm" />
                            <span className="text-xs font-medium">{note.author.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Note form */}
                <div className="mt-3 pt-3 border-t">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                    disabled={submittingNote}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={handleSubmitNote}
                      disabled={!noteContent.trim() || submittingNote}
                      size="sm"
                      variant="outline"
                    >
                      <StickyNote className="h-3.5 w-3.5 mr-1" />
                      {submittingNote ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72 pr-3">
                {ticket.activityLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                ) : (
                  <div className="relative space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                    {ticket.activityLogs.map((log, idx) => (
                      <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="relative z-10 mt-0.5 flex items-center justify-center h-4 w-4 shrink-0">
                          {getActivityIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            {log.details || log.action.replace(/_/g, " ").toLowerCase()}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{log.user.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
