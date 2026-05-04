import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
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
        { error: "Only admins and agents can list users" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Prisma.UserWhereInput = {};

    if (role && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          departmentId: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          department: { select: { id: true, name: true } },
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
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
        { error: "Only admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, password, role, departmentId } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    // Check unique email
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const userRoleToSet: Role =
      role && Object.values(Role).includes(role as Role)
        ? (role as Role)
        : Role.EMPLOYEE;

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: userRoleToSet,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { id: true, name: true } },
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        details: `User ${email} created with role ${userRoleToSet}`,
        userId,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
