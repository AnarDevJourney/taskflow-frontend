import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import { DashboardOverview } from "@types/index";

/**
 * The dashboard's only data source — one query, one request, every widget.
 *
 * `placeholderData` holds the previous render while a refetch is in flight
 * (after the My Tasks checkbox completes a task, say) so the page dims
 * rather than collapsing into skeletons and jumping.
 */
export const useDashboardOverview = (workspaceId: string) =>
  useQuery({
    queryKey: ["dashboard", "overview", workspaceId],
    queryFn: (): Promise<DashboardOverview> =>
      dashboardService.getOverview(workspaceId),
    enabled: !!workspaceId,
    placeholderData: (previous) => previous,
    // the numbers move as the team works — a minute of staleness is fine,
    // and it keeps tab-switching from re-hitting six collections
    staleTime: 60_000,
  });
