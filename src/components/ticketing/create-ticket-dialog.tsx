'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from './store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Department {
  id: string
  name: string
  code: string
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface Agent {
  id: string
  name: string
  email: string
  role: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreateTicketDialog() {
  const { isCreateTicketOpen, setIsCreateTicketOpen, navigateToTicket } = useAppStore()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [tags, setTags] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  // Data
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [agents, setAgents] = useState<Agent[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Fetch departments on open
  useEffect(() => {
    if (!isCreateTicketOpen) return
    async function fetchDepartments() {
      try {
        const res = await fetch('/api/departments')
        if (res.ok) {
          const data = await res.json()
          setDepartments(Array.isArray(data) ? data : [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchDepartments()
  }, [isCreateTicketOpen])

  // Fetch categories when department changes
  useEffect(() => {
    if (!departmentId) {
      setCategories([])
      setCategoryId('')
      return
    }
    async function fetchCategories() {
      try {
        const res = await fetch(`/api/categories?departmentId=${departmentId}`)
        if (res.ok) {
          const data = await res.json()
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchCategories()
  }, [departmentId])

  // Fetch agents on open
  useEffect(() => {
    if (!isCreateTicketOpen) return
    async function fetchAgents() {
      try {
        const res = await fetch('/api/users?role=AGENT&limit=50')
        if (res.ok) {
          const data = await res.json()
          setAgents(data.users || [])
        }
      } catch {
        // Silently fail
      }
    }
    fetchAgents()
  }, [isCreateTicketOpen])

  // Reset form when dialog opens
  useEffect(() => {
    if (isCreateTicketOpen) {
      setTitle('')
      setDescription('')
      setDepartmentId('')
      setCategoryId('')
      setPriority('MEDIUM')
      setTags('')
      setAssigneeId('')
      setError(null)
      setValidationErrors({})
    }
  }, [isCreateTicketOpen])

  // Validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Title is required'
    if (!description.trim()) errors.description = 'Description is required'
    if (!departmentId) errors.departmentId = 'Department is required'
    if (!categoryId) errors.categoryId = 'Category is required'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          departmentId,
          categoryId,
          priority,
          tags: tags.trim(),
          assigneeId: assigneeId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create ticket')
      }

      const ticket = await res.json()
      setIsCreateTicketOpen(false)
      toast.success(`Ticket ${ticket.ticketId || ticket.id} created`)
      navigateToTicket(ticket.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Ticket</DialogTitle>
          <DialogDescription>
            Choose a department and fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ticket-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (validationErrors.title) setValidationErrors((prev) => ({ ...prev, title: '' }))
              }}
              disabled={loading}
              className={validationErrors.title ? 'border-destructive' : ''}
            />
            {validationErrors.title && (
              <p className="text-xs text-destructive">{validationErrors.title}</p>
            )}
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label>
              Department <span className="text-destructive">*</span>
            </Label>
            <Select
              value={departmentId}
              onValueChange={(val) => {
                setDepartmentId(val)
                if (validationErrors.departmentId) setValidationErrors((prev) => ({ ...prev, departmentId: '' }))
              }}
              disabled={loading}
            >
              <SelectTrigger className={validationErrors.departmentId ? 'border-destructive' : ''}>
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
            {validationErrors.departmentId && (
              <p className="text-xs text-destructive">{validationErrors.departmentId}</p>
            )}
          </div>

          {/* Category & Priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={categoryId}
                onValueChange={(val) => {
                  setCategoryId(val)
                  if (validationErrors.categoryId) setValidationErrors((prev) => ({ ...prev, categoryId: '' }))
                }}
                disabled={loading || !departmentId}
              >
                <SelectTrigger className={validationErrors.categoryId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={departmentId ? "Select category" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.categoryId && (
                <p className="text-xs text-destructive">{validationErrors.categoryId}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ticket-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ticket-description"
              placeholder="Provide a detailed description of the issue..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (validationErrors.description) setValidationErrors((prev) => ({ ...prev, description: '' }))
              }}
              disabled={loading}
              rows={4}
              className={`resize-none ${validationErrors.description ? 'border-destructive' : ''}`}
            />
            {validationErrors.description && (
              <p className="text-xs text-destructive">{validationErrors.description}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="ticket-tags">Tags</Label>
            <Input
              id="ticket-tags"
              placeholder="Comma-separated tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateTicketOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
