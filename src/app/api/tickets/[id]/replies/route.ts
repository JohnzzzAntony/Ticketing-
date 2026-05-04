import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
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

    const ticket = await db.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Create reply
    const reply = await db.reply.create({
      data: {
        content: content.trim(),
        ticketId: id,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        action: "REPLY_ADDED",
        details: "A reply was added to the ticket",
        ticketId: id,
        userId,
      },
    });

    // Create notification for ticket creator (if not the replier)
    if (ticket.creatorId !== userId) {
      await db.notification.create({
        data: {
          type: "NEW_REPLY",
          title: "New Reply on Ticket",
          message: `A new reply has been added to ticket ${ticket.ticketId}`,
          userId: ticket.creatorId,
          ticketId: id,
        },
      });
    }

    // Create notification for assignee (if not the replier)
    if (ticket.assigneeId && ticket.assigneeId !== userId) {
      await db.notification.create({
        data: {
          type: "NEW_REPLY",
          title: "New Reply on Assigned Ticket",
          message: `A new reply has been added to ticket ${ticket.ticketId}`,
          userId: ticket.assigneeId,
          ticketId: id,
        },
      });
    }

    // Update SLA first response time if not set
    const sla = await db.sLARecord.findUnique({ where: { ticketId: id } });
    if (sla && !sla.firstResponseAt) {
      await db.sLARecord.update({
        where: { ticketId: id },
        data: { firstResponseAt: new Date() },
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Reply creation error:", error);
    return NextResponse.json(
      { error: "Failed to create reply" },
      { status: 500 }
    );
  }
}
