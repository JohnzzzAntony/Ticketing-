# Task 14: Add toast notification feedback and UX polish to all user actions

## Summary
Added `sonner` toast notifications to all user-facing actions across 4 component files.

## Changes Made

### 1. ticket-detail.tsx
- Added `import { toast } from "sonner"`
- **handleStatusChange**: `toast.success("Status updated to {statusLabel}")` + error toast
- **handlePriorityChange**: `toast.success("Priority updated to {priorityLabel}")` + error toast
- **handleAssignTicket**: `toast.success("Ticket assigned to {agentName}")` + error toast (looks up agent name from agents list)
- **handleAutoAssign**: `toast.success("Ticket auto-assigned to {name}")` + error toast (reads assignee name from API response)
- **handleSubmitReply**: `toast.success("Reply sent")` + error toast
- **handleSubmitNote**: `toast.success("Internal note added")` + error toast
- **handleExport**: `toast.success("Ticket exported")` + error toast

### 2. create-ticket-dialog.tsx
- Added `import { toast } from "sonner"`
- On success: `toast.success("Ticket {ticketId} created")` (uses ticket.ticketId or ticket.id)
- On error: `toast.error(message)` (same message as setError)

### 3. admin-view.tsx
- Added `import { toast } from "sonner"`
- **CategoriesTab.handleSubmit**: `toast.success("Category created")` or `"Category updated"` + error toast
- **CategoriesTab.handleDelete**: `toast.success("Category deleted")` + error toast
- **DepartmentsTab.handleSubmit**: `toast.success("Department created")` + error toast
- **UsersTab.handleSubmit**: `toast.success("User created")` + error toast
- **UsersTab.handleToggleActive**: `toast.success("User activated")` or `"User deactivated"` + error toast
- **SLATab.handleSubmit**: `toast.success("SLA config saved")` + error toast

### 4. notifications-view.tsx
- Added `import { toast } from "sonner"`
- **handleMarkAsRead**: `toast.success("Marked as read")` + error toast
- **handleMarkAllAsRead**: `toast.success("All notifications marked as read")` + error toast

## Verification
- ESLint passes with no errors
- Dev server compiles and runs successfully
- All previous "Could show toast" comments removed
- Non-critical background fetches (dropdowns, polling) remain as silent fails (appropriate behavior)
