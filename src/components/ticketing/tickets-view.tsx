'use client'

import { useState, useEffect, useCallback } from "react"
import { useAppStore } from "./store"
import { formatDistanceToNow, format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import {
  Ticket,
  Plus,
  LayoutList,
  Kanban,
  Search,
  FilterX,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Clock,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED"
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

interface TicketUser {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
}

interface TicketItem {
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
  sla?: {
    id: string
    responseDeadline: string
    resolutionDeadline: string
    isBreached: boolean
  } | null
  _count: {
    replies: number
    internalNotes: number
    attachments: number
  }
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface TicketsResponse {
  tickets: TicketItem[]
  total: number
  page: number
  limit: number
  totalPages: number
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

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={priorityBadgeClass[priority]}>
      {priorityLabels[priority]}
    </Badge>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={statusBadgeClass[status]}>
      {statusLabels[status]}
    </Badge>
  )
}

function UserAvatar({ user, size = "sm" }: { user: TicketUser | null; size?: "sm" | "md" }) {
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

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function TableSkeleton() {
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

function BoardSkeleton() {
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

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
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

// ─── Board Card ──────────────────────────────────────────────────────────────

function BoardCard({ ticket, onClick }: { ticket: TicketItem; onClick: () => void }) {
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
          <span className="text-xs text-muted-foreground">{ticket.category}</span>
          <UserAvatar user={ticket.assignee} />
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function TicketsView() {
  const { navigateToTicket, isCreateTicketOpen, setIsCreateTicketOpen, searchQuery } = useAppStore()

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "board">("table")

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 10

  // Data
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Board data (all tickets, no pagination)
  const [boardTickets, setBoardTickets] = useState<TicketItem[]>([])
  const [boardLoading, setBoardLoading] = useState(false)

  const hasFilters =
    statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || !!searchQuery

  const clearFilters = useCallback(() => {
    setStatusFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setPage(1)
  }, [])

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories")
        if (res.ok) {
          const data = await res.json()
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch {
        // Silently fail for categories
      }
    }
    fetchCategories()
  }, [])

  // Build query params
  const buildQueryParams = useCallback(
    (isBoard = false) => {
      const params = new URLSearchParams()
      if (!isBoard) {
        params.set("page", String(page))
        params.set("limit", String(limit))
      } else {
        params.set("limit", "100")
      }
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter !== "all") params.set("priority", priorityFilter)
      if (categoryFilter !== "all") params.set("category", categoryFilter)
      if (searchQuery) params.set("search", searchQuery)

      switch (sortBy) {
        case "newest":
          params.set("sortBy", "createdAt")
          params.set("sortOrder", "desc")
          break
        case "oldest":
          params.set("sortBy", "createdAt")
          params.set("sortOrder", "asc")
          break
        case "priority":
          params.set("sortBy", "priority")
          params.set("sortOrder", "desc")
          break
        case "updated":
          params.set("sortBy", "updatedAt")
          params.set("sortOrder", "desc")
          break
      }
      return params.toString()
    },
    [page, statusFilter, priorityFilter, categoryFilter, sortBy, searchQuery]
  )

  // Fetch tickets for table view
  useEffect(() => {
    if (viewMode !== "table") return
    let cancelled = false
    async function fetchTickets() {
      setLoading(true)
      setError(null)
      try {
        const qs = buildQueryParams(false)
        const res = await fetch(`/api/tickets?${qs}`)
        if (!res.ok) throw new Error("Failed to fetch tickets")
        const data: TicketsResponse = await res.json()
        if (!cancelled) {
          setTickets(data.tickets)
          setTotal(data.total)
          setTotalPages(data.totalPages)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load tickets")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTickets()
    return () => {
      cancelled = true
    }
  }, [viewMode, page, statusFilter, priorityFilter, categoryFilter, sortBy, searchQuery, buildQueryParams])

  // Fetch tickets for board view
  useEffect(() => {
    if (viewMode !== "board") return
    let cancelled = false
    async function fetchBoardTickets() {
      setBoardLoading(true)
      try {
        const qs = buildQueryParams(true)
        const res = await fetch(`/api/tickets?${qs}`)
        if (!res.ok) throw new Error("Failed to fetch tickets")
        const data: TicketsResponse = await res.json()
        if (!cancelled) {
          setBoardTickets(data.tickets)
          setTotal(data.total)
        }
      } catch {
        // Keep previous board data on error
      } finally {
        if (!cancelled) setBoardLoading(false)
      }
    }
    fetchBoardTickets()
    return () => {
      cancelled = true
    }
  }, [viewMode, statusFilter, priorityFilter, categoryFilter, sortBy, searchQuery, buildQueryParams])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, categoryFilter, sortBy, searchQuery])

  // Group board tickets by status
  const boardColumns: { status: TicketStatus; label: string; color: string; tickets: TicketItem[] }[] = [
    { status: "OPEN", label: "Open", color: "bg-blue-500", tickets: [] },
    { status: "IN_PROGRESS", label: "In Progress", color: "bg-amber-500", tickets: [] },
    { status: "WAITING", label: "Waiting", color: "bg-purple-500", tickets: [] },
    { status: "RESOLVED", label: "Resolved", color: "bg-emerald-500", tickets: [] },
    { status: "CLOSED", label: "Closed", color: "bg-gray-400", tickets: [] },
  ]

  boardTickets.forEach((ticket) => {
    const col = boardColumns.find((c) => c.status === ticket.status)
    if (col) col.tickets.push(ticket)
  })

  // Pagination rendering
  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pages: (number | "ellipsis")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push("ellipsis")
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push("ellipsis")
      pages.push(totalPages)
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, page - 1))}
              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((p, idx) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === page}
                  onClick={() => setPage(p)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <Badge variant="secondary" className="text-sm">
            {total} {total === 1 ? "ticket" : "tickets"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateTicketOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mt-4 px-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            className="pl-8 h-9"
            readOnly
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="WAITING">Waiting</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="updated">Last Updated</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
            <FilterX className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── View Toggle & Content ───────────────────────────────────────── */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "table" | "board")}
        className="mt-4 flex-1 flex flex-col min-h-0"
      >
        <div className="flex items-center justify-between px-1">
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <LayoutList className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5">
              <Kanban className="h-4 w-4" />
              Board
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Table View ─────────────────────────────────────────────── */}
        <TabsContent value="table" className="flex-1 min-h-0 mt-3">
          {error ? (
            <Card className="border-destructive/50">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                    // Re-trigger fetch by re-setting page
                    setPage((p) => p)
                  }}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card>
              <CardContent className="p-6">
                <TableSkeleton />
              </CardContent>
            </Card>
          ) : tickets.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState hasFilters={hasFilters} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Ticket ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer group"
                      onClick={() => navigateToTicket(ticket.id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {ticket.ticketId}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {ticket.title}
                          </span>
                          {ticket._count.replies > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {ticket._count.replies} {ticket._count.replies === 1 ? "reply" : "replies"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{ticket.category}</span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={ticket.assignee} />
                          <span className="text-sm">
                            {ticket.assignee?.name || (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              navigateToTicket(ticket.id)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div className="px-4 py-3">
                {renderPagination()}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Board View (Kanban) ────────────────────────────────────── */}
        <TabsContent value="board" className="flex-1 min-h-0 mt-3">
          {boardLoading ? (
            <BoardSkeleton />
          ) : boardTickets.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState hasFilters={hasFilters} />
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-4">
                {boardColumns.map((col) => (
                  <div key={col.status} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <span className="text-sm font-semibold">{col.label}</span>
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {col.tickets.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 min-h-[120px]">
                      {col.tickets.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <p className="text-xs text-muted-foreground">No tickets</p>
                        </div>
                      ) : (
                        col.tickets.map((ticket) => (
                          <BoardCard
                            key={ticket.id}
                            ticket={ticket}
                            onClick={() => navigateToTicket(ticket.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
