import { useQuery } from "@tanstack/react-query";
import { taskService, QueryTasksDto } from "../services/taskService";

export const useTasks = (
  workspaceId: string,
  projectId: string,
  query: QueryTasksDto = {},
) => {
  return useQuery({
    queryKey: ["tasks", workspaceId, projectId, query],
    queryFn: () => taskService.getAll(workspaceId, projectId, query),
    enabled: !!workspaceId && !!projectId,
  });
};
