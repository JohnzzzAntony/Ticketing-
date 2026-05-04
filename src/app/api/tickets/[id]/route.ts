import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitNotification } from "@/lib/notify";
import { TicketStatus, Priority } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true, departmentId: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, avatar: true, departmentId: true },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
        internalNotes: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
        attachments: { orderBy: { createdAt: "desc" } },
        sla: true,
        activityLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Employees can only view their own tickets
    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = (session.user as Record<string, unknown>).id as string;
    if (userRole === "EMPLOYEE" && ticket.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as Record<string, unknown>).id as string;
    const userRole = (session.user as Record<string, unknown>).role as string;

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Employees can only update their own tickets and only certain fields
    if (userRole === "EMPLOYEE" && ticket.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, priority, assigneeId, tags, title, description } = body;

    const updateData: Prisma.TicketUpdateInput = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    if (priority !== undefined && Object.values(Priority).includes(priority as Priority)) {
      updateData.priority = priority as Priority;
    }

    if (assigneeId !== undefined) {
      updateData.assignee = assigneeId
        ? { connect: { id: assigneeId } }
        : { disconnect: true };
    }

    if (status !== undefined && Object.values(TicketStatus).includes(status as TicketStatus)) {
      const oldStatus = ticket.status;
      const newStatus = status as TicketStatus;
      updateData.status = newStatus;

      // Log status change activity
      if (oldStatus !== newStatus) {
        await db.activityLog.create({
          data: {
            action: "STATUS_CHANGED",
            details: `Status changed from ${oldStatus} to ${newStatus}`,
            ticketId: id,
            userId,
          },
        });

        // Create notification for status change
        if (ticket.creatorId !== userId) {
          const statusNotificationData = {
            type: "STATUS_UPDATED",
            title: "Ticket Status Updated",
            message: `Ticket ${ticket.ticketId} status changed from ${oldStatus} to ${newStatus}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          await db.notification.create({
            data: {
              type: "STATUS_UPDATED",
              title: "Ticket Status Updated",
              message: `Ticket ${ticket.ticketId} status changed from ${oldStatus} to ${newStatus}`,
              userId: ticket.creatorId,
              ticketId: id,
            },
          });

          // Emit real-time notification via WebSocket
          emitNotification(ticket.creatorId, statusNotificationData);
        }

        // Check SLA on first response (when status changes from OPEN)
        if (oldStatus === TicketStatus.OPEN && newStatus !== TicketStatus.OPEN) {
          const sla = await db.sLARecord.findUnique({ where: { ticketId: id } });
          if (sla && !sla.firstResponseAt) {
            await db.sLARecord.update({
              where: { ticketId: id },
              data: { firstResponseAt: new Date() },
            });
          }
        }

        // Set resolvedAt if status is RESOLVED
        if (newStatus === TicketStatus.RESOLVED) {
          await db.sLARecord.updateMany({
            where: { ticketId: id },
            data: { resolvedAt: new Date() },
          });
        }

        // Check for SLA breach
        if (newStatus === TicketStatus.RESOLVED || newStatus === TicketStatus.CLOSED) {
          const sla = await db.sLARecord.findUnique({ where: { ticketId: id } });
          if (sla && sla.resolutionDeadline < new Date() && !sla.isBreached) {
            await db.sLARecord.update({
              where: { ticketId: id },
              data: { isBreached: true },
            });
          }
        }
      }
    }

    const updatedTicket = await db.ticket.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        sla: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "TICKET_UPDATED",
        entity: "Ticket",
        entityId: id,
        details: `Ticket ${ticket.ticketId} updated`,
        userId,
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Ticket update error:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete tickets" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = (session.user as Record<string, unknown>).id as string;

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await db.ticket.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "TICKET_DELETED",
        entity: "Ticket",
        entityId: id,
        details: `Ticket ${ticket.ticketId} deleted`,
        userId,
      },
    });

    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Ticket delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
