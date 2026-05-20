'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Plus, Edit, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'

interface SLAConfig {
  id: string
  category: string
  responseTimeHours: number
  resolutionTimeHours: number
  priority: string
  createdAt: string
  updatedAt: string
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function SLATab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  // Form
  const [formCategory, setFormCategory] = useState('')
  const [formResponseTime, setFormResponseTime] = useState('4')
  const [formResolutionTime, setFormResolutionTime] = useState('24')
  const [formPriority, setFormPriority] = useState('MEDIUM')

  const { data: slaConfigs = [], isLoading: loading, error: queryError } = useQuery<SLAConfig[]>({
    queryKey: ['admin', 'sla-config'],
    queryFn: async () => {
      const res = await fetch('/api/sla-config')
      if (!res.ok) throw new Error('Failed to fetch SLA configs')
      return res.json()
    }
  })

  const error = queryError ? (queryError as Error).message : null

  const mutation = useMutation({
    mutationFn: async (slaData: any) => {
      const res = await fetch('/api/sla-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slaData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save SLA config')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sla-config'] })
      toast.success('SLA config saved')
      resetForm()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    }
  })

  const resetForm = () => {
    setFormCategory('')
    setFormResponseTime('4')
    setFormResolutionTime('24')
    setFormPriority('MEDIUM')
    setShowForm(false)
  }

  const handleEdit = (sla: SLAConfig) => {
    setFormCategory(sla.category)
    setFormResponseTime(String(sla.responseTimeHours))
    setFormResolutionTime(String(sla.resolutionTimeHours))
    setFormPriority(sla.priority)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCategory.trim()) return
    mutation.mutate({
      category: formCategory.trim(),
      responseTimeHours: parseInt(formResponseTime) || 4,
      resolutionTimeHours: parseInt(formResolutionTime) || 24,
      priority: formPriority,
    })
  }

  const submitting = mutation.isPending

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={4} cols={4} />
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

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">SLA Configurations</h3>
        <Button
          onClick={() => { resetForm(); setShowForm(true) }}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add SLA Config
        </Button>
      </div>

      {/* Add/Edit Form Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{formCategory && slaConfigs.some((s) => s.category === formCategory) ? 'Edit SLA Config' : 'Add SLA Config'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                placeholder="Category name (e.g., Technical, Billing)"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Response Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formResponseTime}
                  onChange={(e) => setFormResponseTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Resolution Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formResolutionTime}
                  onChange={(e) => setFormResolutionTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Priority</Label>
              <Select value={formPriority} onValueChange={setFormPriority} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formCategory.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Table */}
      <Card>
        <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Resolution Time</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No SLA configurations found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                slaConfigs.map((sla) => (
                  <TableRow key={sla.id}>
                    <TableCell className="font-medium">{sla.category}</TableCell>
                    <TableCell>{sla.responseTimeHours}h</TableCell>
                    <TableCell>{sla.resolutionTimeHours}h</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sla.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(sla)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
