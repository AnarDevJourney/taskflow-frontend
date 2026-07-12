import { useQuery } from "@tanstack/react-query";
import { sprintService } from "../services/sprintService";

export const useSprints = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: ["sprints", workspaceId, projectId],
    queryFn: () => sprintService.getAll(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
  });
};
