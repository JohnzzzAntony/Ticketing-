import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Managers see requests for their department
    // Admins see everything
    const where: any = {};
    if (status) where.status = status;

    if (session.user.role !== "ADMIN") {
      if (!session.user.departmentId) {
        return NextResponse.json({ approvals: [] });
      }
      where.ticket = { departmentId: session.user.departmentId };
    }

    const approvals = await db.approvalRequest.findMany({
      where,
      include: {
        ticket: {
          select: {
            id: true,
            ticketId: true,
            title: true,
            status: true,
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("Approvals GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, comments } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const approval = await db.approvalRequest.findUnique({
      where: { id },
      include: { ticket: true }
    });

    if (!approval) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    // Check permissions
    if (session.user.role !== "ADMIN" && approval.approverId !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedApproval = await db.approvalRequest.update({
      where: { id },
      data: {
        status,
        comments,
      }
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        action: `APPROVAL_${status}`,
        details: `Approval for ticket ${approval.ticket.ticketId} was ${status.toLowerCase()}.${comments ? ' Comment: ' + comments : ''}`,
        ticketId: approval.ticketId,
        userId: session.user.id,
      }
    });

    // If approved, maybe update ticket status or notify
    // Logic can be added here depending on requirements

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error("Approvals PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
