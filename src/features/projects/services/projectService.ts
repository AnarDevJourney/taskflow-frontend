import api from "@lib/axios";
import { ApiResponse, Project, ProjectMember, StatusConfig } from "@types/index";

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  sprintMode?: boolean;
  color?: string;
  icon?: string;
}

export interface UpdateStatusConfigItem {
  name: string;
  color: string;
  order: number;
  wipLimit: number | null;
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

  update: async (
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> => {
    const res = await api.patch<ApiResponse<Project>>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
      dto,
    );
    return res.data.data;
  },

  updateStatuses: async (
    workspaceId: string,
    projectId: string,
    statuses: UpdateStatusConfigItem[],
  ): Promise<Project> => {
    const res = await api.patch<ApiResponse<Project>>(
      `/workspaces/${workspaceId}/projects/${projectId}/statuses`,
      { statuses },
    );
    return res.data.data;
  },

  getMembers: async (
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectMember[]> => {
    const res = await api.get<ApiResponse<ProjectMember[]>>(
      `/workspaces/${workspaceId}/projects/${projectId}/members`,
    );
    return res.data.data;
  },

  removeMember: async (
    workspaceId: string,
    projectId: string,
    memberId: string,
  ): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      `/workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`,
    );
  },

  archive: async (workspaceId: string, projectId: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      `/workspaces/${workspaceId}/projects/${projectId}`,
    );
  },
};
