'use client'

import { useState, useEffect, useCallback } from "react"
import { useAppStore } from "./store"
import { formatDistanceToNow, format } from "date-fns"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

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
  RefreshCw,
  XCircle,
  PauseCircle,
  Eye,
  Building2,
  ClipboardCheck,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = "NEW" | "OPEN" | "PENDING_CUSTOMER" | "PENDING_INTERNAL" | "ESCALATED" | "RESOLVED" | "CLOSED"
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
  author: TicketUser
  createdAt: string
}

interface InternalNote {
  id: string
  content: string
  author: TicketUser
  createdAt: string
}

interface ActivityLogEntry {
  id: string
  action: string
  details: string | null
  user: TicketUser
  createdAt: string
}

interface SLARecord {
  id: string
  responseDeadline: string
  resolutionDeadline: string
  firstResponseAt: string | null
  resolvedAt: string | null
  isBreached: boolean
  createdAt: string
}

interface TicketDetail {
  id: string
  ticketId: string
  title: string
  description: string
  category: { name: string }
  department: { name: string; code: string; id: string }
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
  approvals: {
    id: string
    status: string
    approver: TicketUser
    comments: string | null
    createdAt: string
  }[]
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

const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CLOSED"],
  OPEN: ["PENDING_CUSTOMER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED", "CLOSED"],
  PENDING_CUSTOMER: ["OPEN", "RESOLVED", "CLOSED"],
  PENDING_INTERNAL: ["OPEN", "RESOLVED", "CLOSED"],
  ESCALATED: ["OPEN", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
}

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  NEW: <Sparkles className="h-3.5 w-3.5" />,
  OPEN: <Circle className="h-3.5 w-3.5" />,
  PENDING_CUSTOMER: <PauseCircle className="h-3.5 w-3.5 text-amber-500" />,
  PENDING_INTERNAL: <PauseCircle className="h-3.5 w-3.5 text-purple-500" />,
  ESCALATED: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  RESOLVED: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  CLOSED: <XCircle className="h-3.5 w-3.5 text-gray-500" />,
}

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

function SLAProgressBar({ sla }: { sla: SLARecord }) {
  const now = new Date()
  const responseDeadline = new Date(sla.responseDeadline)
  const resolutionDeadline = new Date(sla.resolutionDeadline)

  const responseElapsedMs = (sla.firstResponseAt ? new Date(sla.firstResponseAt) : now).getTime() - new Date(sla.createdAt).getTime()
  const responseTotalMs = responseDeadline.getTime() - new Date(sla.createdAt).getTime()
  const responseProgress = Math.min(100, Math.max(0, (responseElapsedMs / responseTotalMs) * 100))
  const responseBreached = responseDeadline < now && !sla.firstResponseAt

  const resolutionElapsedMs = (sla.resolvedAt ? new Date(sla.resolvedAt) : now).getTime() - new Date(sla.createdAt).getTime()
  const resolutionTotalMs = resolutionDeadline.getTime() - new Date(sla.createdAt).getTime()
  const resolutionProgress = Math.min(100, Math.max(0, (resolutionElapsedMs / resolutionTotalMs) * 100))
  const resolutionBreached = resolutionDeadline < now && !sla.resolvedAt

  const getColor = (progress: number, breached: boolean) => {
    if (breached || sla.isBreached) return "bg-red-500"
    if (progress > 80) return "bg-amber-500"
    return "bg-emerald-500"
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
          <span>First Response</span>
          <span className={responseBreached ? "text-red-500" : ""}>
            {sla.firstResponseAt ? "Done" : responseBreached ? "Breached" : formatDistanceToNow(responseDeadline, { addSuffix: true })}
          </span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full transition-all ${getColor(responseProgress, responseBreached)}`} style={{ width: `${responseProgress}%` }} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
          <span>Resolution</span>
          <span className={resolutionBreached ? "text-red-500" : ""}>
            {sla.resolvedAt ? "Done" : resolutionBreached ? "Breached" : formatDistanceToNow(resolutionDeadline, { addSuffix: true })}
          </span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full transition-all ${getColor(resolutionProgress, resolutionBreached)}`} style={{ width: `${resolutionProgress}%` }} />
        </div>
      </div>
    </div>
  )
}

export function TicketDetail() {
  const { selectedTicketId, setCurrentView, user } = useAppStore()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [managers, setManagers] = useState<Agent[]>([])

  const isAdminOrAgent = user?.role === 'ADMIN' || user?.role === 'AGENT'

  const fetchTicket = useCallback(async () => {
    if (!selectedTicketId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}`)
      if (!res.ok) throw new Error("Failed to fetch ticket")
      setTicket(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket")
    } finally {
      setLoading(false)
    }
  }, [selectedTicketId])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  useEffect(() => {
    if (!ticket) return
    async function fetchAgents() {
      try {
        const res = await fetch(`/api/users?role=AGENT&departmentId=${ticket?.department.id}`)
        if (res.ok) {
          const data = await res.json()
          setAgents(data.users || [])
        }
      } catch {}
    }
    fetchAgents()
  }, [ticket?.department.id])

  useEffect(() => {
    if (!ticket) return
    async function fetchManagers() {
      try {
        const res = await fetch(`/api/users?role=DEPARTMENT_MANAGER&departmentId=${ticket?.department.id}`)
        if (res.ok) {
          const data = await res.json()
          setManagers(data.users || [])
        }
      } catch {}
    }
    fetchManagers()
  }, [ticket?.department.id])

  const handleAction = async (action: string, data: any = {}) => {
    if (!ticket || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, actionLabel: action }),
      })
      if (!res.ok) throw new Error("Action failed")
      await fetchTicket()
      toast.success("Ticket updated")
    } catch (err) {
      toast.error("Action failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddReply = async () => {
    if (!replyContent.trim()) return
    await handleAction("REPLY_ADDED", { content: replyContent.trim() })
    setReplyContent("")
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    await handleAction("INTERNAL_NOTE_ADDED", { content: noteContent.trim() })
    setNoteContent("")
  }

  if (loading) return <div className="p-8"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-32 w-full" /></div>
  if (error || !ticket) return <div className="p-8 text-center text-destructive">{error || "Not found"}</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 mb-6 shrink-0 px-1">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground uppercase">{ticket.ticketId}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1 uppercase">{ticket.department.name}</Badge>
          </div>
          <h1 className="text-xl font-bold line-clamp-1">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-3 flex flex-col gap-6 min-h-0 overflow-y-auto pr-2 pb-6">
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={ticket.creator} size="md" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{ticket.creator.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{ticket.description}</ReactMarkdown>
            </CardContent>
          </Card>

          <Tabs defaultValue="replies" className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0 mb-4 bg-muted/50 p-1 w-fit">
              <TabsTrigger value="replies" className="text-xs gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Replies
              </TabsTrigger>
              {(user?.role === 'ADMIN' || user?.role === 'AGENT') && (
                <TabsTrigger value="notes" className="text-xs gap-2">
                  <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                </TabsTrigger>
              )}
              <TabsTrigger value="activity" className="text-xs gap-2">
                <Activity className="h-3.5 w-3.5" /> Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="replies" className="flex-1 flex flex-col min-h-0 outline-none">
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-6">
                  {ticket.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4">
                      <UserAvatar user={reply.author} size="md" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{reply.author.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-2xl rounded-tl-none text-sm border prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{reply.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ticket.replies.length === 0 && <div className="text-center py-12 text-muted-foreground text-xs uppercase font-bold tracking-widest">No replies yet</div>}
                </div>
              </ScrollArea>
              <div className="mt-4 shrink-0">
                <Textarea 
                  placeholder="Type your reply..." 
                  className="min-h-[100px] resize-none text-sm p-4 rounded-2xl border-2 focus-visible:ring-emerald-500"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleAddReply} disabled={submitting || !replyContent.trim()} className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700">
                    <Send className="h-4 w-4 mr-2" /> Send Reply
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 outline-none">
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-4">
                  {ticket.internalNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <UserAvatar user={note.author} size="sm" />
                        <span className="text-xs font-bold">{note.author.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase ml-auto">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                  {ticket.internalNotes.length === 0 && <div className="text-center py-12 text-muted-foreground text-xs uppercase font-bold tracking-widest">No internal notes</div>}
                </div>
              </ScrollArea>
              <div className="mt-4 shrink-0">
                <Textarea 
                  placeholder="Confidential note for agents only..." 
                  className="min-h-[80px] resize-none text-sm p-4 bg-amber-50/50 dark:bg-amber-900/5 border-amber-200"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleAddNote} disabled={submitting || !noteContent.trim()} variant="outline" className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50">
                    Add Note
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 outline-none">
              <ScrollArea className="h-full">
                <div className="space-y-4 pl-4 border-l-2 border-muted ml-2">
                  {ticket.activityLogs.map((log) => (
                    <div key={log.id} className="relative flex gap-4 items-start">
                      <div className="absolute -left-[25px] mt-1 bg-background p-0.5"><div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /></div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold">{log.action.replace(/_/g, ' ')}</span>
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">{log.user.name} • {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 pb-6">
          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="py-4"><CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Status & Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Current Status</label>
                {isAdminOrAgent ? (
                  <Select value={ticket.status} onValueChange={(v) => handleAction("STATUS_CHANGED", { status: v })}>
                    <SelectTrigger className="bg-background border-2 h-9 rounded-xl font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusLabels).map(s => <SelectItem key={s} value={s}>{statusLabels[s as TicketStatus]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <div className="h-9 flex items-center px-3 border-2 rounded-xl bg-background font-bold text-xs uppercase">{statusLabels[ticket.status]}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Priority</label>
                {isAdminOrAgent ? (
                  <Select value={ticket.priority} onValueChange={(v) => handleAction("PRIORITY_CHANGED", { priority: v })}>
                    <SelectTrigger className="bg-background border-2 h-9 rounded-xl font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(priorityLabels).map(p => <SelectItem key={p} value={p}>{priorityLabels[p as Priority]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <div className="h-9 flex items-center px-3 border-2 rounded-xl bg-background font-bold text-xs uppercase">{priorityLabels[ticket.priority]}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Assignee</label>
                {isAdminOrAgent ? (
                  <Select value={ticket.assigneeId || 'none'} onValueChange={(v) => handleAction("TICKET_ASSIGNED", { assigneeId: v === 'none' ? null : v })}>
                    <SelectTrigger className="bg-background border-2 h-9 rounded-xl font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-background border-2 rounded-xl">
                    <UserAvatar user={ticket.assignee} size="sm" />
                    <span className="text-xs font-bold">{ticket.assignee?.name || 'Unassigned'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-none shadow-none">
            <CardHeader className="py-4"><CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">SLA Performance</CardTitle></CardHeader>
            <CardContent>{ticket.sla ? <SLAProgressBar sla={ticket.sla} /> : <div className="text-[10px] text-muted-foreground uppercase font-bold text-center py-4">No SLA Configured</div>}</CardContent>
          </Card>

          {isAdminOrAgent && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
            <Card className="bg-muted/30 border-none shadow-none">
              <CardHeader className="py-4">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select onValueChange={(v) => handleAction("APPROVAL_REQUESTED", { approverId: v, status: 'PENDING_APPROVAL' })}>
                  <SelectTrigger className="bg-background border-2 h-9 rounded-xl font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      <span>Request Approval</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Select Manager</SelectLabel>
                      {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      {managers.length === 0 && <SelectItem value="none" disabled>No managers available</SelectItem>}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {ticket.approvals.length > 0 && (
            <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 shadow-none">
              <CardHeader className="py-4"><CardTitle className="text-[10px] uppercase tracking-widest text-emerald-700 font-black">Approvals</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {ticket.approvals.map(req => (
                  <div key={req.id} className="flex items-center gap-3 bg-background p-2 rounded-xl border">
                    <div className={`h-2 w-2 rounded-full ${req.status === 'APPROVED' ? 'bg-emerald-500' : req.status === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase">{req.approver.name}</span>
                      <span className="text-[10px] text-muted-foreground">{req.status}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest px-1">Details</label>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase">
              <div className="p-3 bg-muted/20 rounded-xl">
                <span className="text-muted-foreground block mb-1">Category</span>
                <span className="line-clamp-1">{ticket.category.name}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl">
                <span className="text-muted-foreground block mb-1">Department</span>
                <span className="line-clamp-1">{ticket.department.code}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
