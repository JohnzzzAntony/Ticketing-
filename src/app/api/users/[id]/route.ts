import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update users" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = (session.user as Record<string, unknown>).id as string;

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, role, departmentId, isActive } = body;

    // Check email uniqueness if changing
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: Role;
      departmentId?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && Object.values(Role).includes(role as Role)) {
      updateData.role = role as Role;
    }
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId || null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
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
    await db.auditLog.create({
      data: {
        action: "USER_UPDATED",
        entity: "User",
        entityId: id,
        details: `User ${existingUser.email} updated`,
        userId,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can deactivate users" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = (session.user as Record<string, unknown>).id as string;

    // Don't allow deactivating yourself
    if (id === userId) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!existingUser.isActive) {
      return NextResponse.json(
        { error: "User is already deactivated" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "USER_DEACTIVATED",
        entity: "User",
        entityId: id,
        details: `User ${existingUser.email} deactivated`,
        userId,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("User deactivation error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}
