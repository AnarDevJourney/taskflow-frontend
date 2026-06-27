import api from "@lib/axios";
import { ApiResponse, PaginatedResponse, Task, Priority } from "@types/index";

export interface CreateTaskDto {
  title: string;
  status: string;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: string;
  description?: string;
  storyPoints?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  storyPoints?: number | null;
  labels?: string[];
}

export interface ReorderTaskDto {
  status: string;
  order: number;
}

export interface QueryTasksDto {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

const base = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

export const taskService = {
  getAll: async (
    workspaceId: string,
    projectId: string,
    query: QueryTasksDto = {},
  ): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.priority) params.set("priority", query.priority);
    if (query.assigneeId) params.set("assigneeId", query.assigneeId);
    if (query.search) params.set("search", query.search);
    params.set("limit", String(query.limit ?? 100));
    params.set("page", String(query.page ?? 1));

    const res = await api.get<ApiResponse<PaginatedResponse<Task>>>(
      `${base(workspaceId, projectId)}?${params.toString()}`,
    );
    return res.data.data;
  },

  create: async (
    workspaceId: string,
    projectId: string,
    dto: CreateTaskDto,
  ): Promise<Task> => {
    const res = await api.post<ApiResponse<Task>>(
      base(workspaceId, projectId),
      dto,
    );
    return res.data.data;
  },

  update: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> => {
    const res = await api.patch<ApiResponse<Task>>(
      `${base(workspaceId, projectId)}/${taskId}`,
      dto,
    );
    return res.data.data;
  },

  reorder: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: ReorderTaskDto,
  ): Promise<Task> => {
    const res = await api.patch<ApiResponse<Task>>(
      `${base(workspaceId, projectId)}/${taskId}/reorder`,
      dto,
    );
    return res.data.data;
  },

  remove: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> => {
    await api.delete(`${base(workspaceId, projectId)}/${taskId}`);
  },

  addChecklistItem: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    title: string,
  ): Promise<Task> => {
    const res = await api.post<ApiResponse<Task>>(
      `${base(workspaceId, projectId)}/${taskId}/checklist`,
      { title },
    );
    return res.data.data;
  },

  toggleChecklistItem: async (
    workspaceId: string,
    projectId: string,
    taskId: string,
    index: number,
  ): Promise<Task> => {
    const res = await api.patch<ApiResponse<Task>>(
      `${base(workspaceId, projectId)}/${taskId}/checklist/${index}`,
    );
    return res.data.data;
  },
};
