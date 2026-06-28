import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { useAppDispatch } from "@store/index";
import { setUnreadCount } from "@store/notificationsSlice";
import { useEffect } from "react";

export const useNotifications = () => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
    refetchOnWindowFocus: false,
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30_000, // poll every 30s as fallback
  });

  // sync unread count to Redux so bell badge updates
  useEffect(() => {
    if (unreadQuery.data !== undefined) {
      dispatch(setUnreadCount(unreadQuery.data));
    }
  }, [unreadQuery.data, dispatch]);

  const { mutate: markAsRead } = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      dispatch(setUnreadCount(0));
    },
  });

  return {
    notifications: query.data?.items ?? [],
    isLoading: query.isLoading,
    unreadCount: unreadQuery.data ?? 0,
    markAsRead,
    markAllAsRead,
  };
};
