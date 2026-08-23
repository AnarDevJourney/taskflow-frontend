import api from "@lib/axios";
import { ApiResponse, DashboardOverview } from "@types/index";

export const dashboardService = {
  /**
   * The whole dashboard in one request. There is deliberately no per-widget
   * endpoint — every number on the page comes from this single call so the
   * KPI cards, the charts and the lists can never disagree with each other.
   */
  getOverview: async (
    workspaceId: string,
    projectId?: string,
  ): Promise<DashboardOverview> => {
    const res = await api.get<ApiResponse<DashboardOverview>>(
      `/workspaces/${workspaceId}/dashboard/overview`,
      { params: projectId ? { projectId } : undefined },
    );
    return res.data.data;
  },
};
