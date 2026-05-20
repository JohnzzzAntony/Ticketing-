'use client'

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
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
  Download,
  Calendar as CalendarIcon,
  Building2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

// Types are now imported from ./tickets/types

import dynamic from "next/dynamic"
import { 
  PriorityBadge, 
  StatusBadge, 
  UserAvatar, 
  TableSkeleton, 
  BoardSkeleton, 
  EmptyState, 
  BoardCard 
} from "./tickets/components"
import { TicketItem, TicketStatus, TicketsResponse, Category } from "./tickets/types"

const TicketTable = dynamic(() => import("./tickets/ticket-table").then(mod => mod.TicketTable), {
  loading: () => <TableSkeleton />
})

const TicketBoard = dynamic(() => import("./tickets/ticket-board").then(mod => mod.TicketBoard), {
  loading: () => <BoardSkeleton />
})

// ─── Main Component ──────────────────────────────────────────────────────────

export function TicketsView() {
  const { navigateToTicket, isCreateTicketOpen, setIsCreateTicketOpen, searchQuery } = useAppStore()
  const user = useAppStore((s) => s.user)

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "board">("table")

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Export
  const [exporting, setExporting] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 10

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasFilters =
    statusFilter !== "all" || priorityFilter !== "all" || departmentFilter !== "all" || categoryFilter !== "all" || !!searchQuery || !!dateFrom || !!dateTo

  const clearFilters = useCallback(() => {
    setStatusFilter("all")
    setPriorityFilter("all")
    setDepartmentFilter("all")
    setCategoryFilter("all")
    setDateFrom(undefined)
    setDateTo(undefined)
    setPage(1)
  }, [])

  // Export handler
  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter !== "all") params.set("priority", priorityFilter)
      if (departmentFilter !== "all") params.set("departmentId", departmentFilter)
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
      if (dateFrom) params.set("dateFrom", dateFrom.toISOString().split("T")[0])
      if (dateTo) params.set("dateTo", dateTo.toISOString().split("T")[0])

      const res = await fetch(`/api/export?${params.toString()}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tickets-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Tickets exported successfully")
    } catch {
      toast.error("Failed to export tickets")
    } finally {
      setExporting(false)
    }
  }

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
      if (departmentFilter !== "all") params.set("departmentId", departmentFilter)
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter)
      if (searchQuery) params.set("search", searchQuery)
      if (dateFrom) params.set("dateFrom", dateFrom.toISOString().split("T")[0])
      if (dateTo) params.set("dateTo", dateTo.toISOString().split("T")[0])

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
    [page, statusFilter, priorityFilter, departmentFilter, categoryFilter, sortBy, searchQuery, dateFrom, dateTo]
  )

  // Query params
  const tableQueryParams = useMemo(() => buildQueryParams(false), [buildQueryParams])
  const boardQueryParams = useMemo(() => buildQueryParams(true), [buildQueryParams])

  // Fetch tickets for table view
  const { 
    data: tableData, 
    isLoading: loading, 
    error: tableError,
    isFetching: isFetchingTable,
    refetch: refetchTable
  } = useQuery<TicketsResponse>({
    queryKey: ['tickets', 'table', tableQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/tickets?${tableQueryParams}`)
      if (!res.ok) throw new Error("Failed to fetch tickets")
      return res.json()
    },
    enabled: mounted && viewMode === "table",
    staleTime: 30000,
  })

  // Fetch tickets for board view
  const { 
    data: boardData, 
    isLoading: boardLoading,
    isFetching: isFetchingBoard,
    refetch: refetchBoard
  } = useQuery<TicketsResponse>({
    queryKey: ['tickets', 'board', boardQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/tickets?${boardQueryParams}`)
      if (!res.ok) throw new Error("Failed to fetch tickets")
      return res.json()
    },
    enabled: mounted && viewMode === "board",
    staleTime: 60000,
  })

  // Sync state with query data
  const tickets = tableData?.tickets || []
  const total = tableData?.pagination.total || 0
  const totalPages = tableData?.pagination.totalPages || 0
  const boardTickets = boardData?.tickets || []
  const error = tableError ? (tableError as Error).message : null

  // Fetch departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch("/api/departments")
      if (!res.ok) return { departments: [] }
      return res.json()
    },
    enabled: mounted
  })
  const departments = departmentsData?.departments || []

  // Fetch categories when department filter changes
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', departmentFilter],
    queryFn: async () => {
      const url = departmentFilter !== 'all' 
        ? `/api/categories?departmentId=${departmentFilter}`
        : "/api/categories"
      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: mounted
  })
  const categories = categoriesData || []

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, departmentFilter, categoryFilter, sortBy, searchQuery])

  // Group board tickets by status
  const boardColumns: { status: TicketStatus; label: string; color: string; tickets: TicketItem[] }[] = [
    { status: "NEW", label: "New", color: "bg-slate-500", tickets: [] },
    { status: "OPEN", label: "Open", color: "bg-blue-500", tickets: [] },
    { status: "PENDING_CUSTOMER", label: "Pending Customer", color: "bg-amber-500", tickets: [] },
    { status: "PENDING_INTERNAL", label: "Pending Internal", color: "bg-purple-500", tickets: [] },
    { status: "ESCALATED", label: "Escalated", color: "bg-red-500", tickets: [] },
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
          <PaginationItem key="prev">
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, page - 1))}
              className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((p, idx) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={`page-${p}`}>
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
          <PaginationItem key="next">
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
          {user && (user.role === "ADMIN" || user.role === "AGENT") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-1" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          )}
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
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="PENDING_CUSTOMER">Pending Customer</SelectItem>
            <SelectItem value="PENDING_INTERNAL">Pending Internal</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-9">
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

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
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
                <Button variant="outline" size="sm" className="mt-3" onClick={() => viewMode === "table" ? refetchTable() : refetchBoard()}>Retry</Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card><CardContent className="p-6"><TableSkeleton /></CardContent></Card>
          ) : tickets.length === 0 ? (
            <Card><CardContent className="p-6"><EmptyState hasFilters={hasFilters} /></CardContent></Card>
          ) : (
            <Card className="overflow-hidden">
              <TicketTable 
                tickets={tickets} 
                mounted={mounted} 
                navigateToTicket={navigateToTicket} 
                renderPagination={renderPagination}
              />
            </Card>
          )}
        </TabsContent>

        {/* ── Board View ─────────────────────────────────────────────── */}
        <TabsContent value="board" className="flex-1 min-h-0 mt-3">
          {boardLoading ? (
            <BoardSkeleton />
          ) : boardTickets.length === 0 ? (
            <Card><CardContent className="p-6"><EmptyState hasFilters={hasFilters} /></CardContent></Card>
          ) : (
            <TicketBoard 
              boardColumns={boardColumns} 
              navigateToTicket={navigateToTicket} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
