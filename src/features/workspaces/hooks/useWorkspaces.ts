import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "../services/workspaceService";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaceService.getMyWorkspaces,
  });
};
