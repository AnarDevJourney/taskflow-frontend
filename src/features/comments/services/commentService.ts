import api from "@lib/axios";
import { ApiResponse, PaginatedResponse, Comment } from "@types/index";

const base = (workspaceId: string, projectId: string, taskId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`;

export const commentService = {
  getAll: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<Comment[]> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Comment>>>(
      base(workspaceId, projectId, taskId),
    );
    return res.data.data.items;
  },

  create: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    body: string,
  ): Promise<Comment> => {
    const res = await api.post<ApiResponse<Comment>>(
      base(workspaceId, projectId, taskId),
      { body },
    );
    return res.data.data;
  },

  update: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    body: string,
  ): Promise<Comment> => {
    const res = await api.patch<ApiResponse<Comment>>(
      `${base(workspaceId, projectId, taskId)}/${commentId}`,
      { body },
    );
    return res.data.data;
  },

  remove: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<void> => {
    await api.delete(`${base(workspaceId, projectId, taskId)}/${commentId}`);
  },
};
