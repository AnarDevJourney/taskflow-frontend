import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { workspaceService } from "@features/workspaces/services/workspaceService";
import { projectService } from "@features/projects/services/projectService";
import { taskService } from "../services/taskService";
import { Task } from "@types/index";

export const useMyTasks = (workspaceId: string) => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: ["my-tasks", workspaceId, user?._id],
    queryFn: async (): Promise<Task[]> => {
      if (!user) return [];

      // get all projects in workspace
      const projects = await projectService.getAll(workspaceId);

      // fetch tasks assigned to current user from all projects in parallel
      const results = await Promise.all(
        projects.map((project) =>
          taskService
            .getAll(workspaceId, project._id, {
              assigneeId: user._id,
              limit: 100,
            })
            .catch(() => ({ items: [], meta: {} as any })),
        ),
      );

      return results.flatMap((r) => r.items);
    },
    enabled: !!workspaceId && !!user,
  });
};
