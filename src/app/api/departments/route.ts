import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await db.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, categories: true },
        },
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Departments list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
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
        { error: "Only admins can create departments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, code } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check unique name
    const existing = await db.department.findFirst({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Department with this name already exists" },
        { status: 409 }
      );
    }

    const department = await db.department.create({
      data: { name: name.trim(), code: code.trim().toUpperCase(), description },
      include: {
        _count: { select: { users: true, categories: true } },
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        action: "DEPARTMENT_CREATED",
        entity: "Department",
        entityId: department.id,
        details: `Department ${name} created`,
        userId,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Department creation error:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
