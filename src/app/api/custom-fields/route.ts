import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const fields = await db.departmentCustomField.findMany({
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(fields);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await request.json();
    const { name, label, type, isRequired, departmentId, options } = body;

    if (!name || !label || !type || !departmentId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const field = await db.departmentCustomField.create({
      data: {
        name,
        label,
        type,
        isRequired: !!isRequired,
        departmentId,
        options: options || null,
      },
      include: { department: { select: { name: true } } }
    });

    return NextResponse.json(field);
  } catch (e) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
