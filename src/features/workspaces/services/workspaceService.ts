import api from "@lib/axios";
import { ApiResponse, Workspace, WorkspaceMember, WorkspaceRole } from "@types/index";

export interface CreateWorkspaceDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
}

export interface InviteMemberDto {
  email: string;
  role: WorkspaceRole;
}

export interface InviteMemberResult {
  message: string;
  token: string;
}

export const workspaceService = {
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    const res = await api.get<ApiResponse<Workspace[]>>("/workspaces");
    return res.data.data;
  },

  create: async (dto: CreateWorkspaceDto): Promise<Workspace> => {
    const res = await api.post<ApiResponse<Workspace>>("/workspaces", dto);
    return res.data.data;
  },

  getOne: async (workspaceId: string): Promise<Workspace> => {
    const res = await api.get<ApiResponse<Workspace>>(
      `/workspaces/${workspaceId}`,
    );
    return res.data.data;
  },

  update: async (
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> => {
    const res = await api.patch<ApiResponse<Workspace>>(
      `/workspaces/${workspaceId}`,
      dto,
    );
    return res.data.data;
  },

  getMembers: async (workspaceId: string): Promise<WorkspaceMember[]> => {
    const res = await api.get<ApiResponse<WorkspaceMember[]>>(
      `/workspaces/${workspaceId}/members`,
    );
    return res.data.data;
  },

  inviteMember: async (
    workspaceId: string,
    dto: InviteMemberDto,
  ): Promise<InviteMemberResult> => {
    const res = await api.post<ApiResponse<InviteMemberResult>>(
      `/workspaces/${workspaceId}/members/invite`,
      dto,
    );
    return res.data.data;
  },

  removeMember: async (workspaceId: string, memberId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  updateMemberRole: async (
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
  ): Promise<void> => {
    await api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, {
      role,
    });
  },

  archive: async (workspaceId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}`);
  },

  getArchivedWorkspaces: async (): Promise<Workspace[]> => {
    const res = await api.get<ApiResponse<Workspace[]>>("/workspaces/archived");
    return res.data.data;
  },

  restore: async (workspaceId: string): Promise<void> => {
    await api.patch(`/workspaces/${workspaceId}/restore`);
  },
};
