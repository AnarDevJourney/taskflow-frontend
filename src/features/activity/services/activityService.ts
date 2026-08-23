import api from "@lib/axios";
import { ApiResponse, PaginatedResponse, ActivityLog } from "@types/index";

export interface QueryWorkspaceActivityDto {
  page?: number;
  limit?: number;
  userId?: string;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const activityService = {
  getWorkspaceActivity: async (
    workspaceId: string,
    query: QueryWorkspaceActivityDto,
  ): Promise<PaginatedResponse<ActivityLog>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<ActivityLog>>>(
      `/workspaces/${workspaceId}/activity`,
      { params: query },
    );
    return res.data.data;
  },

  /**
   * One log entry by id, independent of the Activity Log page's current
   * filters/page — used to deep-link straight to an entry (the dashboard's
   * Recent Activity widget) without needing it to be on the visible page.
   */
  getOne: async (workspaceId: string, logId: string): Promise<ActivityLog> => {
    const res = await api.get<ApiResponse<ActivityLog>>(
      `/workspaces/${workspaceId}/activity/${logId}`,
    );
    return res.data.data;
  },
};
