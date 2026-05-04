import { io } from "socket.io-client";

// This is a server-side utility to emit notifications via WebSocket
// Called from API routes after creating notifications in the database

let socketInstance: ReturnType<typeof io> | null = null;

function getSocket() {
  if (!socketInstance) {
    socketInstance = io("http://localhost:3003/api", {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function emitNotification(userId: string, notification: Record<string, unknown>) {
  try {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("notify", { userId, notification });
    } else {
      socket.on("connect", () => {
        socket.emit("notify", { userId, notification });
      });
    }
  } catch {
    // WebSocket notification is best-effort, don't block
  }
}

export function emitBroadcast(notification: Record<string, unknown>) {
  try {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("broadcast", { notification });
    } else {
      socket.on("connect", () => {
        socket.emit("broadcast", { notification });
      });
    }
  } catch {
    // WebSocket notification is best-effort, don't block
  }
}
