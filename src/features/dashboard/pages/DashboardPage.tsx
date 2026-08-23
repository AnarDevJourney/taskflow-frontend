import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Empty, Select, Skeleton } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { DashboardActivity, DashboardTask } from "@types/index";
import { useTheme } from "@lib/theme/ThemeProvider";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useProjects } from "@features/projects/hooks/useProjects";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import KpiCard from "../components/KpiCard";
import DashboardDonutChart, { DonutDatum } from "../components/DashboardDonutChart";
import MyTasksWidget from "../components/MyTasksWidget";
import RecentActivityWidget from "../components/RecentActivityWidget";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import SprintProgressCard from "../components/SprintProgressCard";
import ProductivityTrendChart from "../components/ProductivityTrendChart";
import WorkloadByAssigneeChart from "../components/WorkloadByAssigneeChart";
import ActivityHeatmap from "../components/ActivityHeatmap";
import {
  PRIORITY_ORDER,
  priorityChartColors,
  STATUS_ORDER,
  statusChartColors,
} from "../utils/chartPalette";
import styles from "./DashboardPage.module.css";

/** Sentinel `Select` value for "no project filter" — a real `Select` option
 * needs a defined value, and `undefined` is what the query hook/service
 * already treat as "workspace-wide", so this is translated at the boundary
 * rather than threaded through as a magic string everywhere else. */
const ALL_PROJECTS = "__all__";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  // only so the viewer's own bar can be marked in the workload chart
  const { data: currentUser } = useCurrentUser();

  // the dashboard's project filter — `undefined` (no selection) means the
  // whole workspace, exactly the previous, unfiltered behavior
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const { data: projects } = useProjects(workspaceId ?? "");

  // Switching workspace (the topbar switcher, not a route remount) must not
  // carry a project selection from the previous one into this one's filter.
  // Adjusted during render rather than in a `useEffect` — the recommended
  // "state that depends on a prop" pattern — so there is no extra render
  // where a stale `projectId` briefly still applies.
  const [renderedForWorkspaceId, setRenderedForWorkspaceId] = useState(workspaceId);
  if (workspaceId !== renderedForWorkspaceId) {
    setRenderedForWorkspaceId(workspaceId);
    setProjectId(undefined);
  }

  // one request for the whole page — every widget below reads from this
  const { data, isLoading, isError, isFetching } = useDashboardOverview(
    workspaceId ?? "",
    projectId,
  );

  // ─── Chart data ────────────────────────────────────────────────────
  // Both transforms are memoized on the response slice they read, so
  // Recharts gets a stable array identity and doesn't restart its animation
  // when an unrelated part of the dashboard re-renders.
  const statusColors = useMemo(
    () => statusChartColors(resolvedTheme),
    [resolvedTheme],
  );
  const priorityColorMap = useMemo(
    () => priorityChartColors(resolvedTheme),
    [resolvedTheme],
  );

  const statusData: DonutDatum[] = useMemo(() => {
    const counts = new Map(data?.taskStatus.map((s) => [s.status, s.count]));
    // driven by the fixed order, not by the response array, so a slice can
    // never change position between refetches
    return STATUS_ORDER.map((status) => ({
      id: status,
      label: t(`dashboardPage.status.${status}`),
      value: counts.get(status) ?? 0,
    }));
  }, [data?.taskStatus, t]);

  const priorityData: DonutDatum[] = useMemo(() => {
    const counts = new Map(
      data?.priorityDistribution.map((p) => [p.priority, p.count]),
    );
    return PRIORITY_ORDER.map((priority) => ({
      id: priority,
      label: t(`dashboardPage.priority.${priority}`),
      value: counts.get(priority) ?? 0,
    }));
  }, [data?.priorityDistribution, t]);

  const statusTotal = useMemo(
    () => statusData.reduce((sum, d) => sum + d.value, 0),
    [statusData],
  );
  const priorityTotal = useMemo(
    () => priorityData.reduce((sum, d) => sum + d.value, 0),
    [priorityData],
  );

  // A priority slice is only a link to the board when the dashboard itself
  // is already scoped to one project — the board is per-project, so a
  // workspace-wide priority count has no single board to land on.
  const handlePriorityClick = useCallback(
    (priority: string) => {
      if (!workspaceId || !projectId) return;
      navigate(
        `/workspaces/${workspaceId}/projects/${projectId}/board?priority=${priority}`,
      );
    },
    [navigate, workspaceId, projectId],
  );

  // Same gating as the priority donut above: a Recent Activity row only
  // links to the Activity Log page's drawer once the dashboard is already
  // scoped to one project.
  const handleActivityClick = useCallback(
    (activity: DashboardActivity) => {
      if (!workspaceId || !projectId) return;
      navigate(`/workspaces/${workspaceId}/activity?logId=${activity._id}`);
    },
    [navigate, workspaceId, projectId],
  );

  // Unlike the priority donut and Recent Activity above, a task row (Upcoming
  // Deadlines or My Tasks) already names its own project on every item — the
  // click always has a definite board to land on, so it is never gated on
  // the dashboard's own project filter.
  const handleTaskRowClick = useCallback(
    (task: DashboardTask) => {
      if (!workspaceId) return;
      navigate(
        `/workspaces/${workspaceId}/projects/${task.projectId}/board?task=${task._id}`,
      );
    },
    [navigate, workspaceId],
  );

  // Same gating as the priority donut and Recent Activity: the workload
  // chart is a workspace-wide aggregate (a bar per person across every
  // project), so a name only links to the board once the dashboard is
  // already scoped to one project — there'd be no single board to land on
  // otherwise.
  const handleAssigneeClick = useCallback(
    (userId: string) => {
      if (!workspaceId || !projectId) return;
      navigate(
        `/workspaces/${workspaceId}/projects/${projectId}/board?assignee=${userId}`,
      );
    },
    [navigate, workspaceId, projectId],
  );

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className={styles.errorState}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("dashboardPage.loadFailed")}
        />
      </div>
    );
  }

  return (
    // a refetch dims the page instead of tearing it down — no skeleton
    // flash, no layout jump while the numbers update
    <div className={`${styles.page} ${isFetching ? styles.refetching : ""}`}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("dashboardPage.title")}</h1>
          <p className={styles.pageSubtitle}>{t("dashboardPage.subtitle")}</p>
        </div>
        <Select
          className={styles.projectFilter}
          value={projectId ?? ALL_PROJECTS}
          placeholder={t("dashboardPage.projectFilterPlaceholder")}
          onChange={(value) =>
            setProjectId(value === ALL_PROJECTS ? undefined : value)
          }
          options={[
            { value: ALL_PROJECTS, label: t("dashboardPage.allProjects") },
            ...(projects?.map((project) => ({
              value: project._id,
              label: project.name,
            })) ?? []),
          ]}
        />
      </header>

      {/* ─── 1. KPI cards ──────────────────────────────────────────── */}
      <section className={styles.kpiGrid}>
        <KpiCard
          icon={<UnorderedListOutlined />}
          accent="var(--primary)"
          value={data.kpis.activeTasks.current}
          label={t("dashboardPage.kpi.activeTasks")}
          kpi={data.kpis.activeTasks}
          periodLabel={t("dashboardPage.kpi.vsLastWeek")}
          // more open work isn't good news, but it isn't bad news either —
          // it's the closest of the four to neutral, so it reads as "growing
          // backlog = watch it"
          higherIsBetter={false}
        />
        <KpiCard
          icon={<ExclamationCircleOutlined />}
          accent="var(--danger)"
          value={data.kpis.overdueTasks.current}
          label={t("dashboardPage.kpi.overdueTasks")}
          kpi={data.kpis.overdueTasks}
          periodLabel={t("dashboardPage.kpi.vsLastWeek")}
          higherIsBetter={false}
        />
        <KpiCard
          icon={<CheckCircleOutlined />}
          accent="var(--success)"
          value={data.kpis.completedThisMonth.current}
          label={t("dashboardPage.kpi.completedThisMonth")}
          kpi={data.kpis.completedThisMonth}
          periodLabel={t("dashboardPage.kpi.vsLastMonth")}
          higherIsBetter
        />
        <KpiCard
          icon={<BellOutlined />}
          accent="var(--warning)"
          value={data.kpis.unreadNotifications.current}
          label={t("dashboardPage.kpi.unreadNotifications")}
          kpi={data.kpis.unreadNotifications}
          periodLabel={t("dashboardPage.kpi.vsLastWeek")}
          higherIsBetter={false}
        />
      </section>

      {/* ─── 2. The two donuts ─────────────────────────────────────── */}
      <section className={styles.chartGrid}>
        <DashboardDonutChart
          title={t("dashboardPage.charts.statusTitle")}
          total={statusTotal}
          totalLabel={t("dashboardPage.charts.totalTasks")}
          data={statusData}
          colors={statusColors}
        />
        <DashboardDonutChart
          title={t("dashboardPage.charts.priorityTitle")}
          total={priorityTotal}
          totalLabel={t("dashboardPage.charts.openTasks")}
          data={priorityData}
          colors={priorityColorMap}
          // clickable only once the dashboard is already narrowed to a
          // single project — see handlePriorityClick
          onSliceClick={projectId ? handlePriorityClick : undefined}
        />
      </section>

      {/* ─── 3. Productivity trend — full width, under the donuts ──── */}
      <ProductivityTrendChart
        data={data.productivityTrend}
        theme={resolvedTheme}
      />

      {/* ─── 4–6. The three list widgets ───────────────────────────── */}
      <section className={styles.widgetGrid}>
        <MyTasksWidget
          workspaceId={workspaceId ?? ""}
          tasks={data.myTasks}
          total={data.myTasksTotal}
          // always clickable — every task already names its own project,
          // see handleTaskRowClick
          onTaskClick={handleTaskRowClick}
        />
        <RecentActivityWidget
          activities={data.recentActivities}
          // clickable only once the dashboard is already narrowed to a
          // single project — see handleActivityClick
          onActivityClick={projectId ? handleActivityClick : undefined}
        />
        <UpcomingDeadlinesWidget
          tasks={data.upcomingDeadlines}
          // always clickable — every task already names its own project,
          // see handleTaskRowClick
          onTaskClick={handleTaskRowClick}
        />
      </section>

      {/* ─── 7. Team status — workload beside sprint progress ─────────
          These two answer the same question (where does the team stand right
          now?), and pairing them fills a row that Sprint Progress alone left
          mostly empty. */}
      <section className={styles.teamGrid}>
        <WorkloadByAssigneeChart
          data={data.workloadByAssignee}
          currentUserId={currentUser?._id}
          theme={resolvedTheme}
          // clickable only once the dashboard is already narrowed to a
          // single project — see handleAssigneeClick
          onNameClick={projectId ? handleAssigneeClick : undefined}
        />
        <SprintProgressCard sprint={data.sprint} theme={resolvedTheme} />
      </section>

      {/* ─── 8. Activity heatmap — full width, closes the page ──────── */}
      <ActivityHeatmap heatmap={data.activityHeatmap} theme={resolvedTheme} />
    </div>
  );
}

/** Matches the real layout's grid, so nothing shifts when the data lands. */
function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <Skeleton active paragraph={{ rows: 1 }} title={{ width: 220 }} />
      <div className={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ))}
      </div>
      <div className={styles.chartGrid}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
