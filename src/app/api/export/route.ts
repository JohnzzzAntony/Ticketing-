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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN" && userRole !== "AGENT") {
      return NextResponse.json(
        { error: "Only admins and agents can export tickets" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
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

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
      }
    }

    const tickets = await db.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } },
      },
    });

    // Generate CSV
    const headers = [
      "Ticket ID",
      "Title",
      "Description",
      "Category",
      "Priority",
      "Status",
      "Tags",
      "Creator",
      "Creator Email",
      "Assignee",
      "Assignee Email",
      "Created At",
      "Updated At",
    ];

    const escapeCSV = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...tickets.map((ticket) =>
        [
          escapeCSV(ticket.ticketId),
          escapeCSV(ticket.title),
          escapeCSV(ticket.description.replace(/[\r\n]+/g, " ")),
          escapeCSV(ticket.category),
          escapeCSV(ticket.priority),
          escapeCSV(ticket.status),
          escapeCSV(ticket.tags),
          escapeCSV(ticket.creator.name),
          escapeCSV(ticket.creator.email),
          escapeCSV(ticket.assignee?.name || "Unassigned"),
          escapeCSV(ticket.assignee?.email || ""),
          escapeCSV(new Date(ticket.createdAt).toISOString()),
          escapeCSV(new Date(ticket.updatedAt).toISOString()),
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tickets-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export tickets" },
      { status: 500 }
    );
  }
}
