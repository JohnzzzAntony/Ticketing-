export type TicketStatus = "NEW" | "OPEN" | "PENDING_CUSTOMER" | "PENDING_INTERNAL" | "ESCALATED" | "RESOLVED" | "CLOSED"
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface TicketUser {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Category {
  id: string
  name: string
  departmentId: string
}

export interface TicketItem {
  id: string
  ticketId: string
  title: string
  description: string
  category: { name: string }
  department: { name: string, code: string }
  priority: Priority
  status: TicketStatus
  tags: string
  creatorId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  creator: TicketUser
  assignee: TicketUser | null
  sla?: {
    id: string
    responseDeadline: string
    resolutionDeadline: string
    isBreached: boolean
  } | null
  _count: {
    replies: number
    internalNotes: number
    attachments: number
  }
}

export interface TicketsResponse {
  tickets: TicketItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
