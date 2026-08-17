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
};
