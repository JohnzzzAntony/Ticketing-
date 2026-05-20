import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Priority } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const slaConfigs = await db.sLAConfig.findMany({
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });

    return NextResponse.json(slaConfigs);
  } catch (error) {
    console.error("SLA configs list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SLA configs" },
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

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can create SLA configs" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { categoryId, responseTimeHours, resolutionTimeHours, priority } = body;

    if (!categoryId || responseTimeHours === undefined || resolutionTimeHours === undefined) {
      return NextResponse.json(
        { error: "categoryId, responseTimeHours, and resolutionTimeHours are required" },
        { status: 400 }
      );
    }

    const slaPriority: Priority =
      priority && Object.values(Priority).includes(priority as Priority)
        ? (priority as Priority)
        : Priority.MEDIUM;

    // Upsert: create or update if category already exists
    const slaConfig = await db.sLAConfig.upsert({
      where: { categoryId },
      update: {
        responseTimeHours: parseInt(String(responseTimeHours)),
        resolutionTimeHours: parseInt(String(resolutionTimeHours)),
        priority: slaPriority,
      },
      create: {
        categoryId,
        responseTimeHours: parseInt(String(responseTimeHours)),
        resolutionTimeHours: parseInt(String(resolutionTimeHours)),
        priority: slaPriority,
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        action: "SLA_CONFIG_SET",
        entity: "SLAConfig",
        entityId: slaConfig.id,
        details: `SLA config set for category ${categoryId}: response ${responseTimeHours}h, resolution ${resolutionTimeHours}h`,
        userId,
      },
    });

    return NextResponse.json(slaConfig, { status: 201 });
  } catch (error) {
    console.error("SLA config creation error:", error);
    return NextResponse.json(
      { error: "Failed to create SLA config" },
      { status: 500 }
    );
  }
}
