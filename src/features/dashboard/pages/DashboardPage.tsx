import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Empty, Skeleton } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@lib/theme/ThemeProvider";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
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

export default function DashboardPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { resolvedTheme } = useTheme();
  // only so the viewer's own bar can be marked in the workload chart
  const { data: currentUser } = useCurrentUser();

  // one request for the whole page — every widget below reads from this
  const { data, isLoading, isError, isFetching } = useDashboardOverview(
    workspaceId ?? "",
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
        />
        <RecentActivityWidget activities={data.recentActivities} />
        <UpcomingDeadlinesWidget tasks={data.upcomingDeadlines} />
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
