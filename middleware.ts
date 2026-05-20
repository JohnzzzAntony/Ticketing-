import { NextRequest, NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_API_REQUESTS = 120;

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return response;
  }

  const key = getClientKey(request);
  const now = Date.now();
  const bucket = buckets.get(key);
  const nextBucket = !bucket || bucket.resetAt <= now
    ? { count: 1, resetAt: now + WINDOW_MS }
    : { count: bucket.count + 1, resetAt: bucket.resetAt };
  buckets.set(key, nextBucket);

  if (nextBucket.count > MAX_API_REQUESTS) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const method = request.method.toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth/");
  if (isMutation && !isAuthRoute) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const originHost = origin ? new URL(origin).host : null;
    if (originHost && host && originHost !== host) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
