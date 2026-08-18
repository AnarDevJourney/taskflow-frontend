import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch } from "@store/index";
import { receiveNotification, setUnreadCount } from "@store/notificationsSlice";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useNotificationToast } from "./useNotificationToast";
import api from "@lib/axios";
import { Notification } from "@types/index";

// server → client events, mirrored from notifications.constants.ts
const EVENT_NEW = "notification:new";
const EVENT_COUNT = "notification:count";
const EVENT_UNAUTHORIZED = "unauthorized";

interface NewNotificationPayload {
  notification: Notification;
  unreadCount: number;
}

// the access token lives 15 minutes; a tab left open overnight will fail the
// handshake, so we refresh and retry — but only a few times, otherwise a
// genuinely logged-out session would hammer the server forever
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Keeps a websocket open to /notifications for as long as a user is signed
 * in. Everything the bell and the toast need arrives here — the REST polling
 * in useNotifications is only a fallback for when this connection is down.
 *
 * Auth rides on the HttpOnly `access_token` cookie: `withCredentials` makes
 * the browser attach it to the handshake, and the gateway reads it there.
 */
export const useNotificationSocket = () => {
  const { data: user } = useCurrentUser();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const showToast = useNotificationToast();

  const refreshAttempts = useRef(0);

  // the toast callback is recreated on every render — keep it in a ref so it
  // never becomes a reason to tear the socket down and reconnect
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

    const WS_URL = import.meta.env.VITE_WS_URL as string;

    const socket = io(`${WS_URL}/notifications`, {
      withCredentials: true, // sends the access_token cookie with the handshake
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    refreshAttempts.current = 0;

    socket.on("connect", () => {
      refreshAttempts.current = 0;
    });

    // a new notification — the payload carries the authoritative unread
    // count, so the badge never has to be derived on the client
    socket.on(EVENT_NEW, ({ notification, unreadCount }: NewNotificationPayload) => {
      dispatch(receiveNotification({ notification, unreadCount }));
      showToastRef.current(notification);

      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    });

    // count-only update: sent on connect and whenever notifications are
    // marked read (possibly from another tab)
    socket.on(EVENT_COUNT, ({ unreadCount }: { unreadCount: number }) => {
      dispatch(setUnreadCount(unreadCount));
      qc.setQueryData(["notifications-unread-count"], unreadCount);
    });

    // the gateway rejected the handshake — refresh the cookie and retry,
    // the same recovery the axios interceptor does for REST calls
    socket.on(EVENT_UNAUTHORIZED, () => {
      if (refreshAttempts.current >= MAX_REFRESH_ATTEMPTS) return;
      refreshAttempts.current += 1;

      api
        .post("/auth/refresh")
        .then(() => socket.connect())
        .catch(() => undefined);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId, dispatch, qc]);
};
