import api from "@lib/axios";
import { ApiResponse, Sprint } from "@types/index";

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateSprintDto {
  name?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export enum IncompleteTaskAction {
  MOVE_TO_BACKLOG = "backlog",
  MOVE_TO_NEXT_SPRINT = "next_sprint",
}

export interface CompleteSprintDto {
  incompleteTaskAction: IncompleteTaskAction;
  nextSprintId?: string;
}

export interface VelocityPoint {
  sprintId: string;
  name: string;
  startDate: string;
  endDate: string;
  completedAt: string;
  totalPoints: number;
  completedPoints: number;
  velocity: number;
}

export interface BurndownDay {
  date: string;
  ideal: number;
  actual: number | null;
}

export interface BurndownReport {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  totalPoints: number;
  days: BurndownDay[];
}

const base = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/sprints`;

export const sprintService = {
  getAll: async (workspaceId: string, projectId: string): Promise<Sprint[]> => {
    const res = await api.get<ApiResponse<Sprint[]>>(base(workspaceId, projectId));
    return res.data.data;
  },

  getOne: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<Sprint> => {
    const res = await api.get<ApiResponse<Sprint>>(
      `${base(workspaceId, projectId)}/${sprintId}`,
    );
    return res.data.data;
  },

  create: async (
    workspaceId: string,
    projectId: string,
    dto: CreateSprintDto,
  ): Promise<Sprint> => {
    const res = await api.post<ApiResponse<Sprint>>(
      base(workspaceId, projectId),
      dto,
    );
    return res.data.data;
  },

  update: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
    dto: UpdateSprintDto,
  ): Promise<Sprint> => {
    const res = await api.patch<ApiResponse<Sprint>>(
      `${base(workspaceId, projectId)}/${sprintId}`,
      dto,
    );
    return res.data.data;
  },

  remove: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<void> => {
    await api.delete(`${base(workspaceId, projectId)}/${sprintId}`);
  },

  start: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<Sprint> => {
    const res = await api.post<ApiResponse<Sprint>>(
      `${base(workspaceId, projectId)}/${sprintId}/start`,
    );
    return res.data.data;
  },

  complete: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
    dto: CompleteSprintDto,
  ): Promise<Sprint> => {
    const res = await api.post<ApiResponse<Sprint>>(
      `${base(workspaceId, projectId)}/${sprintId}/complete`,
      dto,
    );
    return res.data.data;
  },

  getVelocity: async (
    workspaceId: string,
    projectId: string,
    limit = 10,
  ): Promise<VelocityPoint[]> => {
    const res = await api.get<ApiResponse<VelocityPoint[]>>(
      `${base(workspaceId, projectId)}/reports/velocity?limit=${limit}`,
    );
    return res.data.data;
  },

  getBurndown: async (
    workspaceId: string,
    projectId: string,
    sprintId: string,
  ): Promise<BurndownReport> => {
    const res = await api.get<ApiResponse<BurndownReport>>(
      `${base(workspaceId, projectId)}/${sprintId}/reports/burndown`,
    );
    return res.data.data;
  },
};
