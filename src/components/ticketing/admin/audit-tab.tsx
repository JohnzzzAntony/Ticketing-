'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TableSkeleton } from './admin-skeleton'

import { useQuery } from '@tanstack/react-query'
import { AuditLog } from './types'

export default function AuditLogsTab() {
  const [page, setPage] = useState(1)
  const limit = 15

  const { data: logsData, isLoading: loading, error: queryError } = useQuery<{ logs: AuditLog[], totalPages: number }>({
    queryKey: ['admin', 'audit-logs', page],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?page=${page}&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      return res.json()
    }
  })

  const logs = logsData?.logs || []
  const totalPages = logsData?.totalPages || 1
  const error = queryError ? (queryError as Error).message : null

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('ellipsis')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, page - 1))}
              className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={6} cols={5} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <h3 className="text-base font-semibold">Audit Logs</h3>

      <Card>
        <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead className="hidden lg:table-cell">User</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[250px] truncate">
                      {log.details || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {log.user?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Separator />
        <div className="px-4 py-3">
          {renderPagination()}
        </div>
      </Card>
    </div>
  )
}
