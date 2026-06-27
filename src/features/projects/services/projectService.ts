import api from "@lib/axios";
import { ApiResponse, Project } from "@types/index";

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
  color?: string;
}

export const projectService = {
  getAll: async (workspaceId: string): Promise<Project[]> => {
    const res = await api.get<ApiResponse<Project[]>>(
      `/workspaces/${workspaceId}/projects`,
    );
    return res.data.data;
  },

  getOne: async (workspaceId: string, projectId: string): Promise<Project> => {
    const res = await api.get<ApiResponse<Project>>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
    );
    return res.data.data;
  },

  create: async (
    workspaceId: string,
    dto: CreateProjectDto,
  ): Promise<Project> => {
    const res = await api.post<ApiResponse<Project>>(
      `/workspaces/${workspaceId}/projects`,
      dto,
    );
    return res.data.data;
  },
};
