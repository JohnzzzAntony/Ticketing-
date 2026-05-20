import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitNotification } from "@/lib/notify";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN" && userRole !== "AGENT") {
      return NextResponse.json(
        { error: "Only agents and admins can assign tickets" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = (session.user as Record<string, unknown>).id as string;

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const body = await request.json();
    let { assigneeId } = body;

    // Auto-assign: find agent with fewest active tickets if no assigneeId provided
    if (!assigneeId) {
      const agents = await db.user.findMany({
        where: {
          role: { in: ["AGENT", "ADMIN"] },
          isActive: true,
        },
        include: {
          _count: {
            select: {
              assignedTickets: {
                where: {
                  status: { in: ["NEW", "OPEN", "PENDING_CUSTOMER", "PENDING_INTERNAL", "ESCALATED"] },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      if (agents.length > 0) {
        const sortedAgents = agents.sort(
          (a, b) => a._count.assignedTickets - b._count.assignedTickets
        );
        assigneeId = sortedAgents[0].id;
      }
    }

    const updatedTicket = await db.ticket.update({
      where: { id },
      data: { assigneeId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    // Create activity log
    const assigneeName = updatedTicket.assignee?.name || "Unassigned";
    await db.activityLog.create({
      data: {
        action: "TICKET_ASSIGNED",
        details: `Ticket assigned to ${assigneeName}`,
        ticketId: id,
        userId,
      },
    });

    // Create notification for assignee
    if (assigneeId && assigneeId !== userId) {
      const assignNotificationData = {
        type: "TICKET_ASSIGNED",
        title: "New Ticket Assigned",
        message: `You have been assigned ticket ${ticket.ticketId}: ${ticket.title}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await db.notification.create({
        data: {
          type: "TICKET_ASSIGNED",
          title: "New Ticket Assigned",
          message: `You have been assigned ticket ${ticket.ticketId}: ${ticket.title}`,
          userId: assigneeId,
          ticketId: id,
        },
      });

      // Emit real-time notification via WebSocket
      emitNotification(assigneeId, assignNotificationData);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "TICKET_ASSIGNED",
        entity: "Ticket",
        entityId: id,
        details: `Ticket ${ticket.ticketId} assigned to ${assigneeName}`,
        userId,
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Ticket assignment error:", error);
    return NextResponse.json(
      { error: "Failed to assign ticket" },
      { status: 500 }
    );
  }
}
