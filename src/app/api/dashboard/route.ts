import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Get total tickets count
    const totalTickets = await db.ticket.count();

    // Get tickets by status
    const [openTickets, inProgressTickets, waitingTickets, resolvedTickets, closedTickets] = await Promise.all([
      db.ticket.count({ where: { status: "OPEN" } }),
      db.ticket.count({ where: { status: "IN_PROGRESS" } }),
      db.ticket.count({ where: { status: "WAITING" } }),
      db.ticket.count({ where: { status: "RESOLVED" } }),
      db.ticket.count({ where: { status: "CLOSED" } }),
    ]);

    // Get tickets by category
    const ticketsByCategoryRaw = await db.ticket.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    const ticketsByCategory = ticketsByCategoryRaw.map((item) => ({
      category: item.category,
      count: item._count.id,
    }));

    // Get tickets by priority
    const ticketsByPriorityRaw = await db.ticket.groupBy({
      by: ["priority"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    const ticketsByPriority = ticketsByPriorityRaw.map((item) => ({
      priority: item.priority.charAt(0) + item.priority.slice(1).toLowerCase(),
      count: item._count.id,
    }));

    // Get recent tickets
    const recentTickets = await db.ticket.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    // Get SLA breach count
    const slaBreachCount = await db.sLARecord.count({ where: { isBreached: true } });

    // Get monthly trend (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyTrendRaw = await db.ticket.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap.set(key, 0);
    }
    for (const t of monthlyTrendRaw) {
      const key = `${monthNames[t.createdAt.getMonth()]} ${t.createdAt.getFullYear()}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
      }
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, count]) => ({
      month: month.split(" ")[0],
      count,
    }));

    // Get recent activity
    const recentActivity = await db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      closedTickets,
      ticketsByCategory,
      ticketsByPriority,
      recentTickets,
      slaBreachCount,
      monthlyTrend,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        description: a.details || a.action,
        userName: a.user.name,
        timestamp: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
