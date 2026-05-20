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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Plus, Trash2, Edit, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Category, Department } from './types'

export default function CategoriesTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDepartmentId, setFormDepartmentId] = useState('')

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Queries
  const { data: categories = [], isLoading: catsLoading, error: catError } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    }
  })

  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      return res.json()
    }
  })

  const loading = catsLoading || deptsLoading
  const error = catError ? (catError as Error).message : null

  // Mutations
  const categoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save category')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success(editId ? 'Category updated' : 'Category created')
      resetForm()
    },
    onError: (err) => {
      toast.error(err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast.success('Category deleted')
      setDeleteId(null)
    },
    onError: (err) => {
      toast.error(err.message)
    }
  })

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormDepartmentId('')
    setEditId(null)
    setShowForm(false)
  }

  const handleEdit = (cat: Category) => {
    setEditId(cat.id)
    setFormName(cat.name)
    setFormDescription(cat.description || '')
    setFormDepartmentId(cat.departmentId)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formDepartmentId) return
    categoryMutation.mutate({
      id: editId || undefined,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      departmentId: formDepartmentId,
    })
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId)
  }

  const submitting = categoryMutation.isPending

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={5} cols={4} />
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
        <h3 className="text-base font-semibold">Categories</h3>
        <Button
          onClick={() => { resetForm(); setShowForm(true) }}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </div>

      {/* Add/Edit Form Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editId ? 'Edit Category' : 'Add Category'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Category name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={formDepartmentId} onValueChange={setFormDepartmentId} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Category description"
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
                disabled={submitting || !formName.trim() || !formDepartmentId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? 'Update' : 'Create'}
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
                <TableHead>Department</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No categories found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {cat.department?.name || 'None'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {cat.description || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(cat)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
