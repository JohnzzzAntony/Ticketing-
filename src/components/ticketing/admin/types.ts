export interface Category {
  id: string
  name: string
  description: string | null
  departmentId: string
  department: { id: string; name: string; description: string | null } | null
}

export interface Department {
  id: string
  name: string
  description: string | null
  _count: { users: number; categories: number }
}

export interface UserItem {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  avatar: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  department: { id: string; name: string } | null
  _count: { createdTickets: number; assignedTickets: number }
}

export interface SLAConfig {
  id: string
  category: string
  responseTimeHours: number
  resolutionTimeHours: number
  priority: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  userId: string
  user: { id: string; name: string; email: string; role: string }
  createdAt: string
}
