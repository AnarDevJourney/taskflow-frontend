import { useQuery } from "@tanstack/react-query";
import {
  activityService,
  QueryWorkspaceActivityDto,
} from "../services/activityService";

export const useWorkspaceActivity = (
  workspaceId: string,
  query: QueryWorkspaceActivityDto,
) => {
  return useQuery({
    queryKey: ["workspace-activity", workspaceId, query],
    queryFn: () => activityService.getWorkspaceActivity(workspaceId, query),
    enabled: !!workspaceId,
    placeholderData: (previous) => previous,
  });
};
