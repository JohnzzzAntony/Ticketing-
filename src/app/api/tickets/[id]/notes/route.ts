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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN" && userRole !== "AGENT") {
      return NextResponse.json(
        { error: "Only agents and admins can add internal notes" },
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
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const note = await db.internalNote.create({
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
        action: "INTERNAL_NOTE_ADDED",
        details: "An internal note was added to the ticket",
        ticketId: id,
        userId,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Internal note creation error:", error);
    return NextResponse.json(
      { error: "Failed to create internal note" },
      { status: 500 }
    );
  }
}
