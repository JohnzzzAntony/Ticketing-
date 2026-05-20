import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userRole = (session.user as any).role;
    const userDeptId = (session.user as any).departmentId;
    
    let departmentId = searchParams.get("departmentId") || undefined;
    if (userRole !== "ADMIN") {
      departmentId = userDeptId || undefined;
    }

    // Cache key based on user and department
    const cacheKey = `dashboard_${departmentId || 'all'}_${userRole}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const ticketWhere: Prisma.TicketWhereInput = {};
    const activityWhere: Prisma.ActivityLogWhereInput = {};
    const slaWhere: Prisma.SLARecordWhereInput = { isBreached: true };

    if (departmentId) {
      ticketWhere.departmentId = departmentId;
      activityWhere.ticket = { departmentId };
      slaWhere.ticket = { departmentId };
    }

    // 1. Basic Stats
    const [
      totalTickets,
      statusCountsRaw,
      priorityCountsRaw,
      slaBreachCount
    ] = await Promise.all([
      db.ticket.count({ where: ticketWhere }),
      db.ticket.groupBy({ by: ['status'], where: ticketWhere, _count: true }),
      db.ticket.groupBy({ by: ['priority'], where: ticketWhere, _count: true }),
      db.sLARecord.count({ where: slaWhere }),
    ]);

    // 2. Category Counts (Optimized)
    const categoryCountsRaw = await db.ticket.groupBy({
      by: ['categoryId'],
      where: ticketWhere,
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    const categories = await db.category.findMany({
      where: { id: { in: categoryCountsRaw.map(c => c.categoryId) } },
      select: { id: true, name: true }
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const ticketsByCategory = categoryCountsRaw.map(c => ({
      category: categoryMap.get(c.categoryId) || 'Unknown',
      count: c._count
    }));

    // 3. Monthly Trends (Optimized with Promise.all)
    const trendPromises: Promise<{ month: string; count: number }>[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      trendPromises.push(
        db.ticket.count({
          where: {
            ...ticketWhere,
            createdAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }).then(count => ({
          month: startOfMonth.toLocaleString('default', { month: 'short' }),
          count
        }))
      );
    }
    const trendResults = await Promise.all(trendPromises);

    // 4. Recent Data
    const [recentTickets, recentActivity] = await Promise.all([
      db.ticket.findMany({
        where: ticketWhere,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { 
          category: { select: { name: true } },
          creator: { select: { name: true } } 
        }
      }),
      db.activityLog.findMany({
        where: activityWhere,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          ticket: { select: { ticketId: true } }
        }
      })
    ]);

    // Process status & priority maps
    const statusMap = {
      NEW: 0, OPEN: 0, PENDING_CUSTOMER: 0, PENDING_INTERNAL: 0,
      ESCALATED: 0, RESOLVED: 0, CLOSED: 0,
    };
    statusCountsRaw.forEach(row => { statusMap[row.status as keyof typeof statusMap] = row._count; });

    const ticketsByPriority = priorityCountsRaw.map(row => ({
      priority: row.priority.charAt(0) + row.priority.slice(1).toLowerCase(),
      count: row._count,
    }));

    const responseData = {
      totalTickets,
      ...statusMap,
      ticketsByCategory,
      ticketsByPriority,
      recentTickets: recentTickets.map(t => ({
        id: t.id,
        ticketId: t.ticketId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category.name,
        createdAt: t.createdAt.toISOString(),
        creatorName: t.creator.name
      })),
      slaBreachCount,
      monthlyTrend: trendResults,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        description: a.details || `${a.action.replace(/_/g, ' ')} on ${a.ticket.ticketId}`,
        userName: a.user.name,
        timestamp: a.createdAt.toISOString(),
      })),
    };

    // Store in cache
    cache.set(cacheKey, { data: responseData, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
