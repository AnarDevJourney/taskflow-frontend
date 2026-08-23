import { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { DashboardTask } from "@types/index";
import { getDueBadge } from "../utils/dueBadge";
import WidgetCard from "./WidgetCard";
import styles from "./UpcomingDeadlinesWidget.module.css";

interface Props {
  tasks: DashboardTask[];
  /**
   * When given, every row becomes a button that calls this with the clicked
   * task. Omit it to keep the widget purely informational — nothing is
   * clickable by default.
   */
  onTaskClick?: (task: DashboardTask) => void;
}

/** The workspace's next five deadlines inside a seven-day horizon. */
export default function UpcomingDeadlinesWidget({ tasks, onTaskClick }: Props) {
  const { t } = useTranslation();

  return (
    <WidgetCard
      title={t("dashboardPage.deadlines.title")}
      emptyText={t("dashboardPage.deadlines.empty")}
      isEmpty={tasks.length === 0}
    >
      {tasks.map((task) => {
        const badge = getDueBadge(task.dueDate, t);

        return (
          <li
            key={task._id}
            className={`${styles.row} ${onTaskClick ? styles.rowClickable : ""}`}
            {...(onTaskClick
              ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => onTaskClick(task),
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onTaskClick(task);
                    }
                  },
                }
              : {})}
          >
            <div className={styles.body}>
              <span className={styles.title} title={task.title}>
                {task.title}
              </span>
              {task.project && (
                <span className={styles.project}>
                  <span
                    className={styles.projectDot}
                    style={{ background: task.project.color }}
                    aria-hidden="true"
                  />
                  {task.project.name}
                </span>
              )}
            </div>

            {badge && (
              <span className={`${styles.badge} ${styles[badge.tone]}`}>
                {badge.label}
              </span>
            )}
          </li>
        );
      })}
    </WidgetCard>
  );
}
