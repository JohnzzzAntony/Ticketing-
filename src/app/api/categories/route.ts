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
    const departmentId = searchParams.get("departmentId");

    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const categories = await db.category.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        department: { select: { id: true, name: true, description: true, code: true } },
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

    const userRole = (session.user as any).role as string;
    if (userRole !== "ADMIN" && userRole !== "DEPARTMENT_MANAGER") {
      return NextResponse.json(
        { error: "Only admins and managers can create categories" },
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

    const category = await db.category.create({
      data: { name, description, departmentId },
      include: {
        department: true,
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
