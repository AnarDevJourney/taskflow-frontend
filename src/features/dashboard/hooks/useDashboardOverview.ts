import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import { DashboardOverview } from "@types/index";

/**
 * The dashboard's only data source — one query, one request, every widget.
 *
 * `placeholderData` holds the previous render while a refetch is in flight
 * (after the My Tasks checkbox completes a task, or the project filter
 * changes) so the page dims rather than collapsing into skeletons and
 * jumping.
 *
 * `projectId` narrows the whole page to one project — omit it (or pass
 * `undefined`) for the workspace-wide view, which is the default.
 */
export const useDashboardOverview = (workspaceId: string, projectId?: string) =>
  useQuery({
    queryKey: ["dashboard", "overview", workspaceId, projectId ?? null],
    queryFn: (): Promise<DashboardOverview> =>
      dashboardService.getOverview(workspaceId, projectId),
    enabled: !!workspaceId,
    placeholderData: (previous) => previous,
    // the numbers move as the team works — a minute of staleness is fine,
    // and it keeps tab-switching from re-hitting six collections
    staleTime: 60_000,
  });
