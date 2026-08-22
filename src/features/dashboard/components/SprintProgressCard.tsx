import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { DashboardSprint, TaskStatusBucket } from "@types/index";
import { ResolvedTheme, statusChartColors } from "../utils/chartPalette";
import styles from "./SprintProgressCard.module.css";

interface Props {
  sprint: DashboardSprint | null;
  theme: ResolvedTheme;
}

/**
 * Sprint progress as a single stacked meter rather than a plain percentage
 * bar: the same three status colors the donut above uses, in the same order,
 * so the bar reads as "where the sprint's work currently sits" and matches
 * the chart it sits under.
 *
 * Segments are separated by a 2px gap in the card surface, not by a stroke.
 */
function SprintProgressCard({ sprint, theme }: Props) {
  const { t } = useTranslation();
  const colors = statusChartColors(theme);

  const segments = useMemo(() => {
    if (!sprint || sprint.total === 0) return [];

    const rows: { bucket: TaskStatusBucket; count: number }[] = [
      { bucket: "done", count: sprint.completed },
      { bucket: "in_progress", count: sprint.inProgress },
      { bucket: "todo", count: sprint.todo },
    ];

    return rows
      .filter((row) => row.count > 0)
      .map((row) => ({ ...row, percent: (row.count / sprint.total) * 100 }));
  }, [sprint]);

  if (!sprint) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>{t("dashboardPage.sprint.title")}</h3>
        <p className={styles.empty}>{t("dashboardPage.sprint.empty")}</p>
      </section>
    );
  }

  const daysLeft = Math.max(0, dayjs(sprint.endDate).startOf("day").diff(dayjs().startOf("day"), "day"));

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{t("dashboardPage.sprint.title")}</h3>
          <p className={styles.sprintName}>
            {sprint.name}
            <span className={styles.daysLeft}>
              {t("dashboardPage.sprint.daysLeft", { days: daysLeft })}
            </span>
          </p>
        </div>
        <div className={styles.percent}>
          {sprint.progress}
          <span className={styles.percentSign}>%</span>
        </div>
      </header>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={sprint.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("dashboardPage.sprint.title")}
      >
        {segments.map((segment) => (
          <span
            key={segment.bucket}
            className={styles.segment}
            style={{
              width: `${segment.percent}%`,
              background: colors[segment.bucket],
            }}
          />
        ))}
      </div>

      <ul className={styles.breakdown}>
        {(["done", "in_progress", "todo"] as TaskStatusBucket[]).map((bucket) => (
          <li key={bucket} className={styles.breakdownItem}>
            <span
              className={styles.swatch}
              style={{ background: colors[bucket] }}
              aria-hidden="true"
            />
            <span className={styles.breakdownLabel}>
              {t(`dashboardPage.status.${bucket}`)}
            </span>
            <span className={styles.breakdownValue}>
              {bucket === "done"
                ? sprint.completed
                : bucket === "in_progress"
                  ? sprint.inProgress
                  : sprint.todo}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(SprintProgressCard);
