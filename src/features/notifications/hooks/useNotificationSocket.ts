import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@store/index";
import { addNotification } from "@store/notificationsSlice";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { Notification } from "@types/index";

let socket: Socket | null = null;

export const useNotificationSocket = () => {
  const { data: user } = useCurrentUser();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const WS_URL = import.meta.env.VITE_WS_URL as string;

    socket = io(`${WS_URL}/notifications`, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[WS] Notifications connected");
    });

    socket.on("notification", (notification: Notification) => {
      // add to Redux state — updates bell badge instantly
      dispatch(addNotification(notification));
      // invalidate query so panel refreshes
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    });

    socket.on("disconnect", () => {
      console.log("[WS] Notifications disconnected");
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [user?._id]);
};
