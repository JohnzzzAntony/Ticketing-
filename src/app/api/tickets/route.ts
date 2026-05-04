import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketStatus, Priority } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const assigneeId = searchParams.get("assigneeId");
    const creatorId = searchParams.get("creatorId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Prisma.TicketWhereInput = {};

    if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
      where.status = status as TicketStatus;
    }

    if (priority && Object.values(Priority).includes(priority as Priority)) {
      where.priority = priority as Priority;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { ticketId: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
      }
    }

    // Employees can only see their own tickets
    const userRole = (session.user as Record<string, unknown>).role as string;
    const userId = (session.user as Record<string, unknown>).id as string;
    if (userRole === "EMPLOYEE") {
      where.OR = [
        { creatorId: userId },
        ...(where.OR || []),
      ];
    }

    const skip = (page - 1) * limit;

    const orderBy: Prisma.TicketOrderByWithRelationInput = {};
    if (sortBy && sortOrder) {
      (orderBy as Record<string, string>)[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          creator: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
          sla: true,
          _count: { select: { replies: true, internalNotes: true, attachments: true } },
        },
      }),
      db.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Tickets list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority, tags, assigneeId } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Auto-generate ticketId
    const lastTicket = await db.ticket.findFirst({
      orderBy: { createdAt: "desc" },
      select: { ticketId: true },
    });

    let nextNumber = 1;
    if (lastTicket) {
      const parts = lastTicket.ticketId.split("-");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
    const ticketId = `TKT-${String(nextNumber).padStart(4, "0")}`;

    const ticketPriority: Priority = priority && Object.values(Priority).includes(priority as Priority)
      ? (priority as Priority)
      : Priority.MEDIUM;

    // Create ticket
    const ticket = await db.ticket.create({
      data: {
        ticketId,
        title,
        description,
        category,
        priority: ticketPriority,
        tags: tags || "",
        creatorId: userId,
        assigneeId: assigneeId || null,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });

    // Create SLA record based on category config
    const slaConfig = await db.sLAConfig.findFirst({
      where: { category },
    });

    if (slaConfig) {
      const now = new Date();
      await db.sLARecord.create({
        data: {
          ticketId: ticket.id,
          responseDeadline: new Date(
            now.getTime() + slaConfig.responseTimeHours * 60 * 60 * 1000
          ),
          resolutionDeadline: new Date(
            now.getTime() + slaConfig.resolutionTimeHours * 60 * 60 * 1000
          ),
        },
      });
    }

    // Create activity log
    await db.activityLog.create({
      data: {
        action: "TICKET_CREATED",
        details: `Ticket ${ticketId} created`,
        ticketId: ticket.id,
        userId,
      },
    });

    // Create notification for assigned agent
    if (assigneeId) {
      await db.notification.create({
        data: {
          type: "TICKET_ASSIGNED",
          title: "New Ticket Assigned",
          message: `You have been assigned ticket ${ticketId}: ${title}`,
          userId: assigneeId,
          ticketId: ticket.id,
        },
      });

      await db.activityLog.create({
        data: {
          action: "TICKET_ASSIGNED",
          details: `Ticket assigned to agent`,
          ticketId: ticket.id,
          userId,
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "TICKET_CREATED",
        entity: "Ticket",
        entityId: ticket.id,
        details: `Ticket ${ticketId} created with category ${category}`,
        userId,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Ticket creation error:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
