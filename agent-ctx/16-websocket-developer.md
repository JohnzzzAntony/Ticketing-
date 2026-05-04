# Task 16: Add WebSocket real-time notification service

## Summary
Added a WebSocket-based real-time notification service using Socket.io that works alongside the existing polling-based notification system for instant updates.

## Files Created
1. `/mini-services/notification-service/package.json` - Mini-service config with socket.io dependency
2. `/mini-services/notification-service/index.ts` - Socket.io server on port 3003 with user rooms and /api namespace
3. `/src/hooks/use-notification-socket.ts` - Client-side React hook for WebSocket connections via gateway
4. `/src/lib/notify.ts` - Server-side utility to emit notifications via WebSocket

## Files Modified
1. `/src/components/ticketing/notification-bell.tsx` - Integrated WebSocket hook, added deduplication, kept polling as fallback
2. `/src/app/api/tickets/route.ts` - Added emitNotification after ticket creation notification
3. `/src/app/api/tickets/[id]/route.ts` - Added emitNotification after status change notification
4. `/src/app/api/tickets/[id]/assign/route.ts` - Added emitNotification after assignment notification
5. `/src/app/api/tickets/[id]/replies/route.ts` - Added emitNotification after reply notifications

## Architecture
- **Notification Service (Port 3003)**: Socket.io server with user rooms (`user:{userId}`) and `/api` namespace
- **Frontend Connection**: `io("/?XTransformPort=3003")` via Caddy gateway - NEVER direct localhost
- **Backend Emission**: Connects to `http://localhost:3003/api` namespace from API routes
- **Fallback**: 30-second polling remains active; WebSocket provides instant updates on top

## Key Design Decisions
- Bound to `0.0.0.0` instead of default `::` for IPv4 compatibility in sandbox
- Added HTTP health check endpoint at `/` for service monitoring
- Best-effort delivery: WebSocket errors are silently caught, never block API responses
- Notification deduplication on frontend by checking IDs before prepending
- Green Wifi icon in notification bell header to indicate real-time connection status
