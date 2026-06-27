import { useQuery } from "@tanstack/react-query";
import { projectService } from "../services/projectService";

export const useProjects = (workspaceId: string) => {
  return useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => projectService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useProject = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: ["projects", workspaceId, projectId],
    queryFn: () => projectService.getOne(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
  });
};
