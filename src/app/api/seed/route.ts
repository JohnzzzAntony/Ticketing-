import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userCount = await db.user.count();
    const ticketCount = await db.ticket.count();
    const isSeeded = userCount > 0;

    return NextResponse.json({
      isSeeded,
      userCount,
      ticketCount,
    });
  } catch (error) {
    console.error("Seed check error:", error);
    return NextResponse.json(
      { error: "Failed to check seed status" },
      { status: 500 }
    );
  }
}
