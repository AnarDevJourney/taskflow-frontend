import api from "@lib/axios";
import { ApiResponse, Workspace } from "@types/index";

export const workspaceService = {
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    const res = await api.get<ApiResponse<Workspace[]>>("/workspaces");
    return res.data.data;
  },

  getOne: async (workspaceId: string): Promise<Workspace> => {
    const res = await api.get<ApiResponse<Workspace>>(
      `/workspaces/${workspaceId}`,
    );
    return res.data.data;
  },
};
