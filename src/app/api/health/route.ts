import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      service: "ticketing-system",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        service: "ticketing-system",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
