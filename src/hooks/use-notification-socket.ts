"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export function useNotificationSocket(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect via gateway - use XTransformPort for the gateway
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      socket.emit("join", userId);
    });

    socket.on("disconnect", () => {
      // Reconnection is handled automatically
    });

    socketRef.current = socket;

    return () => {
      socket.emit("leave", userId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const onNotification = useCallback(
    (callback: (notification: Record<string, unknown>) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on("notification", callback);
      return () => {
        socket.off("notification", callback);
      };
    },
    []
  );

  return { onNotification };
}
