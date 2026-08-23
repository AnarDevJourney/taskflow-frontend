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

/**
 * One log entry by id — powers the `?logId=` deep link into the Activity Log
 * page (see the dashboard's Recent Activity widget), so the drawer can open
 * for an entry that isn't necessarily on the page's current filtered/paged
 * list.
 */
export const useActivityLogEntry = (workspaceId: string, logId?: string) => {
  return useQuery({
    queryKey: ["workspace-activity", workspaceId, "entry", logId],
    queryFn: () => activityService.getOne(workspaceId, logId!),
    enabled: !!workspaceId && !!logId,
  });
};
