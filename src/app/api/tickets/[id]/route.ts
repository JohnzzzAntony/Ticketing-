import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TicketService } from "@/services/ticket.service";
import { Priority, TicketStatus } from "@prisma/client";

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
    const ticket = await TicketService.getTicketById(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const user = session.user as any;
    if (user.role === "EMPLOYEE" && ticket.creatorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    const body = await request.json();
    const user = session.user as any;
    const { actionLabel, ...data } = body;

    let ticket;
    if (actionLabel === "APPROVAL_REQUESTED") {
      ticket = await TicketService.requestApproval(id, data.approverId, data.stepName);
    } else if (actionLabel === "REPLY_ADDED") {
      ticket = await TicketService.addReply({ ticketId: id, authorId: user.id, content: data.content, isInternal: false });
    } else if (actionLabel === "INTERNAL_NOTE_ADDED") {
      ticket = await TicketService.addReply({ ticketId: id, authorId: user.id, content: data.content, isInternal: true });
    } else {
      ticket = await TicketService.updateTicket(id, data, user.id, actionLabel);
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    // For now direct DB call for delete is fine as it's admin only
    const { db } = await import("@/lib/db");
    await db.ticket.delete({ where: { id } });

    return NextResponse.json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("Ticket DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
