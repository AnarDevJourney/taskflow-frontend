import api from "@lib/axios";
import { ApiResponse, Task, Project, User } from "@types/index";

export interface SearchResults {
  tasks: Task[];
  projects: Project[];
  members: User[];
}

export const searchService = {
  global: async (
    query: string,
    workspaceId: string,
  ): Promise<SearchResults> => {
    const res = await api.get<ApiResponse<SearchResults>>(
      `/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`,
    );
    return res.data.data;
  },
};
