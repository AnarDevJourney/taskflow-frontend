import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { taskService, QueryMyTasksDto } from "../services/taskService";
import { PaginatedResponse, Task } from "@types/index";

export const useMyTasks = (workspaceId: string, query: QueryMyTasksDto = {}) => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: ["my-tasks", workspaceId, user?._id, query],
    queryFn: (): Promise<PaginatedResponse<Task>> =>
      taskService.getMyTasks(workspaceId, query),
    enabled: !!workspaceId && !!user,
    placeholderData: (previous) => previous, // keep old page visible while the next page loads
  });
};
