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
import { Plus, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserItem, Department } from './types'

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  AGENT: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  EMPLOYEE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
}

export default function UsersTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  // Form
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('EMPLOYEE')
  const [formDepartmentId, setFormDepartmentId] = useState('')

  // Queries
  const { data: usersData, isLoading: usersLoading, error: userError } = useQuery<{ users: UserItem[] }>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await fetch('/api/users?limit=50')
      if (!res.ok) throw new Error('Failed to fetch users')
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

  const users = usersData?.users || []
  const loading = usersLoading || deptsLoading
  const error = userError ? (userError as Error).message : null

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User created')
      resetForm()
    },
    onError: (err) => {
      toast.error(err.message)
    }
  })

  const removeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User removed')
    },
    onError: (err) => {
      toast.error(err.message)
    }
  })

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('EMPLOYEE')
    setFormDepartmentId('')
    setShowForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) return
    createUserMutation.mutate({
      name: formName.trim(),
      email: formEmail.trim(),
      password: formPassword,
      role: formRole,
      departmentId: formDepartmentId === 'none' ? undefined : (formDepartmentId || undefined),
    })
  }

  const handleRemove = (id: string, name: string) => {
    if (!confirm(`Remove user "${name}"? They will be deactivated.`)) return
    removeUserMutation.mutate(id)
  }

  const submitting = createUserMutation.isPending
  const removingId = removeUserMutation.isPending ? removeUserMutation.variables : null

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

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Users</h3>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add User
        </Button>
      </div>

      {/* Add Form Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add User</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Initial password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={setFormRole} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formDepartmentId} onValueChange={setFormDepartmentId} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formName.trim() || !formEmail.trim() || !formPassword.trim()}
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
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
                 <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ROLE_BADGE[u.role] || ''}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {u.department?.name || 'None'}
                      </Badge>
                    </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemove(u.id, u.name)}
                          disabled={removingId === u.id}
                        >
                          {removingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Remove
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
