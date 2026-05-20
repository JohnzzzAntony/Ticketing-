'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function ApprovalsTab() {
  const queryClient = useQueryClient()

  const { data: approvalsData, isLoading: loading, error } = useQuery<{ approvals: any[] }>({
    queryKey: ['admin', 'approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals')
      if (!res.ok) throw new Error('Failed to fetch approvals')
      return res.json()
    }
  })

  const approvals = approvalsData?.approvals || []

  const actionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'APPROVED' | 'REJECTED' }) => {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Failed to process approval')
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
      toast.success(`Request ${variables.status.toLowerCase()}`)
    },
    onError: () => {
      toast.error('Action failed')
    }
  })

  const handleAction = (id: string, status: 'APPROVED' | 'REJECTED') => {
    actionMutation.mutate({ id, status })
  }

  const processingId = actionMutation.isPending ? actionMutation.variables?.id : null

  if (loading) return <CardContent className="p-6"><TableSkeleton rows={5} cols={5} /></CardContent>

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Pending Approvals</h3>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Approver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No approval requests found.
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{req.ticket.ticketId}</span>
                      <span className="text-sm line-clamp-1">{req.ticket.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{req.approver.name}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'APPROVED' ? 'default' : req.status === 'REJECTED' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleAction(req.id, 'REJECTED')}
                          disabled={!!processingId}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAction(req.id, 'APPROVED')}
                          disabled={!!processingId}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
