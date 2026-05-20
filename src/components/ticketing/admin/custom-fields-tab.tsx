'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Plus, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { TableSkeleton } from './admin-skeleton'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Department } from './types'

interface CustomField {
  id: string
  name: string
  label: string
  type: string
  isRequired: boolean
  options?: string
  departmentId: string
  department?: { name: string }
}

export default function CustomFieldsTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formType, setFormType] = useState('text')
  const [formRequired, setFormRequired] = useState(false)
  const [formDepartmentId, setFormDepartmentId] = useState('')
  const [formOptions, setFormOptions] = useState('')

  const { data: fields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ['admin', 'custom-fields'],
    queryFn: async () => {
      const res = await fetch('/api/custom-fields')
      if (!res.ok) throw new Error('Failed to fetch custom fields')
      return res.json()
    }
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['admin', 'departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'custom-fields'] })
      toast.success('Custom field created')
      resetForm()
    },
    onError: (err) => toast.error(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/custom-fields/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'custom-fields'] })
      toast.success('Custom field deleted')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const resetForm = () => {
    setFormName(''); setFormLabel(''); setFormType('text'); setFormRequired(false)
    setFormDepartmentId(''); setFormOptions(''); setShowForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formLabel.trim() || !formDepartmentId) return
    createMutation.mutate({
      name: formName.trim(),
      label: formLabel.trim(),
      type: formType,
      isRequired: formRequired,
      departmentId: formDepartmentId,
      options: formType === 'select' ? formOptions : undefined,
    })
  }

  if (isLoading) {
    return <Card><CardContent className="p-6"><TableSkeleton rows={4} cols={5} /></CardContent></Card>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Custom Fields</h3>
        <Button onClick={() => setShowForm(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Field
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. employee_id" />
              </div>
              <div>
                <Label>Label *</Label>
                <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="e.g. Employee ID" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department *</Label>
                <Select value={formDepartmentId} onValueChange={setFormDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <input type="checkbox" checked={formRequired} onChange={e => setFormRequired(e.target.checked)} id="req" />
                <Label htmlFor="req">Required</Label>
              </div>
            </div>
            {formType === 'select' && (
              <div>
                <Label>Options (comma separated)</Label>
                <Input value={formOptions} onChange={e => setFormOptions(e.target.value)} placeholder="Option 1, Option 2" />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Required</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No custom fields</TableCell></TableRow>
            ) : fields.map(f => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.label}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.name}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 bg-muted rounded">{f.type}</span></TableCell>
                <TableCell>{f.department?.name || '-'}</TableCell>
                <TableCell>{f.isRequired ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(f.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
