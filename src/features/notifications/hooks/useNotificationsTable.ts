import { useQuery } from "@tanstack/react-query";
import {
  notificationService,
  QueryNotificationsDto,
} from "../services/notificationService";

// separate from useNotifications (bell panel) — this one is filter-driven,
// server-side paginated, and used by the Notifications table page, same
// placeholderData pattern as useWorkspaceActivity so filters don't flash
// empty while refetching
export const useNotificationsTable = (query: QueryNotificationsDto) => {
  return useQuery({
    queryKey: ["notifications-table", query],
    queryFn: () => notificationService.query(query),
    placeholderData: (previous) => previous,
  });
};
