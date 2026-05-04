'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts'
import {
  Ticket,
  CircleDot,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { useAppStore } from './store'
import { formatDistanceToNow } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────

interface TicketItem {
  id: string
  title: string
  status: string
  priority: string
  category: string
  createdAt: string
}

interface ActivityLog {
  id: string
  action: string
  description: string
  userName: string
  timestamp: string
}

interface DashboardData {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  waitingTickets: number
  resolvedTickets: number
  closedTickets: number
  ticketsByCategory: { category: string; count: number }[]
  ticketsByPriority: { priority: string; count: number }[]
  recentTickets: TicketItem[]
  slaBreachCount: number
  monthlyTrend: { month: string; count: number }[]
  recentActivity: ActivityLog[]
}

// ── Priority color map ─────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  Low: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  Medium: { bg: 'bg-amber-100 dark:bg-amber-950/40', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  High: { bg: 'bg-orange-100 dark:bg-orange-950/40', bar: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  Urgent: { bg: 'bg-red-100 dark:bg-red-950/40', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
}

// ── Activity action icons & styles ─────────────────────────────────────────

const ACTION_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  TICKET_CREATED: { icon: <CircleDot className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
  TICKET_ASSIGNED: { icon: <Ticket className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-400' },
  STATUS_CHANGED: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-400' },
  RESOLVED: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
  ESCALATED: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-orange-600 dark:text-orange-400' },
  COMMENTED: { icon: <Clock className="h-3.5 w-3.5" />, color: 'text-slate-600 dark:text-slate-400' },
  UPDATED: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-400' },
  // Legacy lowercase keys
  created: { icon: <CircleDot className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
  assigned: { icon: <Ticket className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-400' },
  resolved: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-400' },
  escalated: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-orange-600 dark:text-orange-400' },
  commented: { icon: <Clock className="h-3.5 w-3.5" />, color: 'text-slate-600 dark:text-slate-400' },
  updated: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-400' },
}

// ── Skeleton loaders ───────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4 p-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  change,
  iconBg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  change?: number
  iconBg: string
}) {
  return (
    <Card className="border-border/50 transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              {change !== undefined && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  <TrendingUp className={`h-3 w-3 ${change < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(change)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setCurrentView } = useAppStore()

  useEffect(() => {
    let cancelled = false

    async function fetchDashboard() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard data')
        const json: DashboardData = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboard()
    return () => { cancelled = true }
  }, [])

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <div className="space-y-6 p-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        {/* Charts skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        {/* Activity & Priority skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-border/50 md:col-span-2">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><ActivitySkeleton /></CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent><Skeleton className="h-48 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Compute helpers ────────────────────────────────────────────────────
  const maxPriorityCount = Math.max(...data.ticketsByPriority.map((p) => p.count), 1)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Ticket className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />}
          label="Total Tickets"
          value={data.totalTickets}
          change={12.5}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          icon={<CircleDot className="h-6 w-6 text-teal-700 dark:text-teal-300" />}
          label="Open Tickets"
          value={data.openTickets}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
        />
        <StatCard
          icon={<Clock className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />}
          label="In Progress"
          value={data.inProgressTickets}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-teal-700 dark:text-teal-300" />}
          label="Resolved"
          value={data.resolvedTickets}
          change={8.2}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
        />
      </div>

      {/* ── Charts Section ─────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Ticket Trends */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Ticket Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#emeraldGradient)"
                  name="Tickets"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets by Category */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.ticketsByCategory} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                />
                <Bar
                  dataKey="count"
                  fill="#14b8a6"
                  radius={[4, 4, 0, 0]}
                  name="Tickets"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Priority Distribution & Activity ───────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity Feed */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-80 pr-2">
              <div className="space-y-1">
                {data.recentActivity.map((activity) => {
                  const style = ACTION_STYLES[activity.action] ?? ACTION_STYLES.updated
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${style.color}`}>
                        {style.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{activity.description}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{activity.userName}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right column: Priority + SLA */}
        <div className="space-y-6">
          {/* Priority Distribution */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {data.ticketsByPriority.map((item) => {
                const colors = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS.Medium
                const pct = Math.max((item.count / maxPriorityCount) * 100, 4)
                return (
                  <div key={item.priority} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${colors.text}`}>{item.priority}</span>
                      <span className="text-muted-foreground tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* SLA Status */}
          <Card className={`border-border/50 ${data.slaBreachCount > 0 ? 'border-red-200 dark:border-red-900/50' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    data.slaBreachCount > 0
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : 'bg-emerald-100 dark:bg-emerald-900/40'
                  }`}
                >
                  <AlertTriangle
                    className={`h-6 w-6 ${
                      data.slaBreachCount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-3xl font-bold tracking-tight ${data.slaBreachCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {data.slaBreachCount}
                  </p>
                  <p className="text-sm text-muted-foreground">SLA Breaches</p>
                </div>
              </div>
              {data.slaBreachCount > 0 && (
                <div className="mt-4">
                  <Badge variant="destructive" className="text-xs">
                    Action required — breaches need attention
                  </Badge>
                </div>
              )}
              {data.slaBreachCount === 0 && (
                <div className="mt-4">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs">
                    All tickets within SLA
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
