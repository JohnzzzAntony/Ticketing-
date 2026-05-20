'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Department } from './types'

export default function DepartmentsTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  // Query
  const { data: departments = [], isLoading, error: deptError } = useQuery<Department[]>({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      return res.json()
    }
  })

  const loading = isLoading
  const error = deptError ? (deptError as Error).message : null

  // Mutation
  const departmentMutation = useMutation({
    mutationFn: async (deptData: { name: string; description?: string }) => {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create department')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      toast.success('Department created')
      resetForm()
    },
    onError: (err) => {
      toast.error(err.message)
    }
  })

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setShowForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    departmentMutation.mutate({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
    })
  }

  const submitting = departmentMutation.isPending

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
        <h3 className="text-base font-semibold">Departments</h3>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Department
        </Button>
      </div>

      {/* Add Form Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Department</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Department name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Department description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={submitting}
                rows={3}
                className="resize-none"
              />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
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
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Categories</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No departments found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {dept.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {dept._count.users}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {dept._count.categories}
                      </Badge>
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
