export const agentRoles = ["ADMIN", "DEPARTMENT_MANAGER", "AGENT"] as const;

export type AppRole = "ADMIN" | "DEPARTMENT_MANAGER" | "AGENT" | "EMPLOYEE";
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "PENDING_CUSTOMER"
  | "PENDING_INTERNAL"
  | "PENDING_APPROVAL"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "PENDING_APPROVAL", "CLOSED"],
  OPEN: ["PENDING_CUSTOMER", "PENDING_INTERNAL", "PENDING_APPROVAL", "ESCALATED", "RESOLVED", "CLOSED"],
  PENDING_CUSTOMER: ["OPEN", "RESOLVED", "CLOSED"],
  PENDING_INTERNAL: ["OPEN", "PENDING_APPROVAL", "RESOLVED", "CLOSED"],
  PENDING_APPROVAL: ["OPEN", "PENDING_CUSTOMER", "CLOSED"],
  ESCALATED: ["OPEN", "PENDING_INTERNAL", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function canManageTickets(role: AppRole | string | undefined) {
  return role === "ADMIN" || role === "DEPARTMENT_MANAGER" || role === "AGENT";
}

export function canAdministerSystem(role: AppRole | string | undefined) {
  return role === "ADMIN";
}

export function canTransitionTicket(from: TicketStatus, to: TicketStatus) {
  return from === to || statusTransitions[from].includes(to);
}
