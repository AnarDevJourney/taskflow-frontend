import api from "@lib/axios";
import { ApiResponse, PaginatedResponse, Notification } from "@types/index";

export interface QueryNotificationsDto {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const notificationService = {
  getAll: async (
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Notification>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
      `/notifications?page=${page}&limit=${limit}`,
    );
    return res.data.data;
  },

  // used by the Notifications table page — full filter set, unlike the
  // bell panel's plain getAll
  query: async (
    query: QueryNotificationsDto,
  ): Promise<PaginatedResponse<Notification>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
      "/notifications",
      { params: query },
    );
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<{ count: number }>>(
      "/notifications/unread-count",
    );
    return res.data.data.count;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },
};
