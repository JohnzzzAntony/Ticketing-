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

    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true, description: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
    if (userRole !== "ADMIN" && userRole !== "AGENT") {
      return NextResponse.json(
        { error: "Only admins and agents can create categories" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, departmentId } = body;

    if (!name || !departmentId) {
      return NextResponse.json(
        { error: "Name and departmentId are required" },
        { status: 400 }
      );
    }

    // Check department exists
    const department = await db.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check unique name within department
    const existing = await db.category.findFirst({
      where: { name, departmentId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Category with this name already exists in this department" },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: { name, description, departmentId },
      include: {
        department: { select: { id: true, name: true, description: true } },
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        action: "CATEGORY_CREATED",
        entity: "Category",
        entityId: category.id,
        details: `Category ${name} created`,
        userId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category creation error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
