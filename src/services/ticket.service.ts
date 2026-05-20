import { db } from "@/lib/db";
import { TicketStatus, Priority, Prisma, NotificationType, ApprovalStatus } from "@prisma/client";
import { SLAService } from "./sla.service";
import { NotificationService } from "./notification.service";
import { revalidateTag } from "next/cache";

export type TicketFilters = {
  status?: TicketStatus[];
  priority?: Priority[];
  categoryId?: string;
  departmentId?: string;
  creatorId?: string;
  assigneeId?: string;
  search?: string;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export class TicketService {
  static async getTickets(filters: TicketFilters = {}, pagination: PaginationParams = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { ticketId: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          category: true,
          department: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.ticket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTicketById(idOrTicketId: string) {
    return db.ticket.findFirst({
      where: {
        OR: [{ id: idOrTicketId }, { ticketId: idOrTicketId }],
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        category: true,
        department: true,
        replies: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        internalNotes: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        sla: true,
        approvals: {
          include: {
            approver: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  static async createTicket(data: {
    title: string;
    description: string;
    departmentId: string;
    categoryId: string;
    priority: Priority;
    creatorId: string;
    tags?: string;
    customData?: string;
  }) {
    // Generate unique ticket ID based on department code
    const dept = await db.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new Error("Department not found");

    const lastTicket = await db.ticket.findFirst({
      where: { ticketId: { startsWith: `${dept.code}-` } },
      orderBy: { ticketId: "desc" },
      select: { ticketId: true },
    });
    const lastSequence = lastTicket ? Number.parseInt(lastTicket.ticketId.split("-").at(-1) || "0", 10) : 0;
    const ticketId = `${dept.code}-${String((Number.isNaN(lastSequence) ? 0 : lastSequence) + 1).padStart(4, "0")}`;

    const ticket = await db.ticket.create({
      data: {
        ...data,
        ticketId,
        status: "NEW",
      },
      include: {
        category: true,
        department: true,
      },
    });

    // Initialize SLA tracking
    await SLAService.calculateSLA(ticket.id, ticket.categoryId, ticket.priority);

    // Notify creator
    await NotificationService.notify({
      userId: data.creatorId,
      type: "TICKET_CREATED",
      title: "Ticket Created",
      message: `Your ticket ${ticketId} has been created in ${dept.name} department.`,
      ticketId: ticket.id,
    });

    await this.logActivity({
      ticketId: ticket.id,
      userId: data.creatorId,
      action: "TICKET_CREATED",
      details: `Ticket created: ${ticketId}`,
    });

    // Invalidate caches
    revalidateTag('dashboard', 'max');
    revalidateTag('tickets', 'max');

    return ticket;
  }

  static async updateTicket(
    id: string,
    data: Prisma.TicketUncheckedUpdateInput,
    userId: string,
    actionLabel?: string
  ) {
    const ticket = await db.ticket.update({
      where: { id },
      data,
      include: {
        department: true,
      },
    });

    if (data.status) {
      // Notify creator about status update
      await NotificationService.notify({
        userId: ticket.creatorId,
        type: "STATUS_UPDATED",
        title: "Ticket Status Updated",
        message: `Your ticket ${ticket.ticketId} status has been updated to ${data.status}.`,
        ticketId: ticket.id,
      });
    }

    if (data.assigneeId) {
      // Notify assignee
      await NotificationService.notify({
        userId: data.assigneeId as string,
        type: "TICKET_ASSIGNED",
        title: "Ticket Assigned",
        message: `You have been assigned to ticket ${ticket.ticketId}.`,
        ticketId: ticket.id,
      });
    }

    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      await SLAService.markResolved(id);
    }

    if (actionLabel) {
      await this.logActivity({
        ticketId: id,
        userId,
        action: "TICKET_UPDATED",
        details: actionLabel,
      });
    }

    revalidateTag('dashboard', 'max');
    revalidateTag('tickets', 'max');

    return ticket;
  }

  static async logActivity(data: {
    ticketId: string;
    userId: string;
    action: string;
    details?: string;
  }) {
    return db.activityLog.create({
      data,
    });
  }

  static async addReply(data: {
    ticketId: string;
    authorId: string;
    content: string;
    isInternal?: boolean;
  }) {
    if (data.isInternal) {
      const note = await db.internalNote.create({
        data: {
          ticketId: data.ticketId,
          authorId: data.authorId,
          content: data.content,
        },
      });

      await this.logActivity({
        ticketId: data.ticketId,
        userId: data.authorId,
        action: "INTERNAL_NOTE_ADDED",
      });

      return note;
    } else {
      const reply = await db.reply.create({
        data: {
          ticketId: data.ticketId,
          authorId: data.authorId,
          content: data.content,
        },
        include: {
          author: { select: { role: true } },
        },
      });

      // Mark first response if the author is an agent/manager/admin
      if (reply.author.role !== "EMPLOYEE") {
        await SLAService.markFirstResponse(data.ticketId);
        
        // Update status to OPEN if it was NEW
        const ticket = await db.ticket.findUnique({ where: { id: data.ticketId } });
        if (ticket?.status === "NEW") {
          await db.ticket.update({
            where: { id: data.ticketId },
            data: { status: "OPEN" },
          });
        }
      }

      await this.logActivity({
        ticketId: data.ticketId,
        userId: data.authorId,
        action: "REPLY_ADDED",
      });

      revalidateTag('dashboard', 'max');
      revalidateTag('tickets', 'max');

      return reply;
    }
  }

  static async requestApproval(ticketId: string, approverId: string, stepName?: string) {
    const approval = await db.approvalRequest.create({
      data: {
        ticketId,
        approverId,
        status: "PENDING",
        stepName,
      },
    });

    await db.ticket.update({
      where: { id: ticketId },
      data: { status: "PENDING_APPROVAL", approvalStatus: "PENDING" },
    });

    await NotificationService.notify({
      userId: approverId,
      type: "APPROVAL_REQUESTED",
      title: "Approval Requested",
      message: `You have a new approval request for ticket ${ticketId}.`,
      ticketId,
    });

    return approval;
  }

  static async actionApproval(id: string, status: ApprovalStatus, comments?: string) {
    const approval = await db.approvalRequest.update({
      where: { id },
      data: { status, comments },
      include: { ticket: true },
    });

    // Update ticket status based on approval
    if (status === "APPROVED") {
      await db.ticket.update({
        where: { id: approval.ticketId },
        data: { approvalStatus: "APPROVED", status: "OPEN" },
      });
    } else if (status === "REJECTED") {
      await db.ticket.update({
        where: { id: approval.ticketId },
        data: { approvalStatus: "REJECTED", status: "PENDING_CUSTOMER" },
      });
    }

    await NotificationService.notify({
      userId: approval.ticket.creatorId,
      type: "APPROVAL_ACTIONED",
      title: `Approval ${status}`,
      message: `Your approval request for ticket ${approval.ticket.ticketId} has been ${status.toLowerCase()}.`,
      ticketId: approval.ticketId,
    });

    return approval;
  }
}
