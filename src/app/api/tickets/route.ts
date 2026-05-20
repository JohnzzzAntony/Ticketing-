import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TicketService } from "@/services/ticket.service";
import { Priority, TicketStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status")?.split(",") as TicketStatus[];
    const priority = searchParams.get("priority")?.split(",") as Priority[];
    const categoryId = searchParams.get("categoryId") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const search = searchParams.get("search") || undefined;
    const creatorId = searchParams.get("creatorId") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;

    const user = session.user as any;
    
    // RBAC: Employees can only see their own tickets unless specified otherwise
    let finalCreatorId = creatorId;
    if (user.role === "EMPLOYEE") {
      finalCreatorId = user.id;
    }

    const result = await TicketService.getTickets(
      {
        status,
        priority,
        categoryId,
        departmentId,
        search,
        creatorId: finalCreatorId,
        assigneeId,
      },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tickets GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const user = session.user as any;

    const ticket = await TicketService.createTicket({
      ...body,
      creatorId: user.id,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Tickets POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
