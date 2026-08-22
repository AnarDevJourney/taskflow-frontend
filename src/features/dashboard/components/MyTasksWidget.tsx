import { useState } from "react";
import { Checkbox, Tooltip } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { DashboardTask } from "@types/index";
import { taskService } from "@features/tasks/services/taskService";
import { priorityColors } from "@features/tasks/utils/taskGrouping";
import { toast } from "@lib/toast";
import WidgetCard from "./WidgetCard";
import styles from "./MyTasksWidget.module.css";

interface Props {
  workspaceId: string;
  tasks: DashboardTask[];
  /** every task due today, not just the (up to five) rows shown */
  total: number;
}

/**
 * The caller's tasks due today (or already past due), five at most.
 *
 * The checkbox completes a task for real — it PATCHes the task's status to
 * its own project's "done" column, whose name the dashboard endpoint resolved
 * server-side (`task.project.doneStatus`). Column names are per-project and
 * free-form, so the client cannot know the target status on its own, and this
 * goes through the ordinary task-update endpoint rather than any new
 * dashboard-specific write path.
 */
export default function MyTasksWidget({ workspaceId, tasks, total }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // tasks being completed right now — checked and struck through immediately,
  // then removed from the list when the refetch lands
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  const { mutate: completeTask } = useMutation({
    mutationFn: (task: DashboardTask) =>
      taskService.update(workspaceId, task.projectId, task._id, {
        status: task.project!.doneStatus!,
      }),
    onMutate: (task) => {
      setCompleting((prev) => new Set(prev).add(task._id));
    },
    onSuccess: () => {
      // the KPI cards, both donuts and the sprint bar all move when a task
      // completes, so the whole overview is refetched rather than patched
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks", workspaceId] });
    },
    onError: (_error, task) => {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(task._id);
        return next;
      });
      toast.error(t("dashboardPage.myTasks.completeFailed"));
    },
  });

  return (
    <WidgetCard
      title={t("dashboardPage.myTasks.title")}
      badge={t("dashboardPage.myTasks.remaining", { value: total })}
      emptyText={t("dashboardPage.myTasks.empty")}
      isEmpty={tasks.length === 0}
    >
      {tasks.map((task) => {
        const isCompleting = completing.has(task._id);
        // no resolvable "done" column means there is nothing to check the
        // box to — disable it rather than sending a status the project
        // doesn't have
        const canComplete = !!task.project?.doneStatus;

        return (
          <li key={task._id} className={styles.row}>
            <Tooltip
              title={canComplete ? undefined : t("dashboardPage.myTasks.noDoneColumn")}
            >
              {/* span wrapper — a disabled AntD checkbox doesn't emit the
                  pointer events the tooltip needs */}
              <span className={styles.checkboxSlot}>
                <Checkbox
                  checked={isCompleting}
                  disabled={!canComplete || isCompleting}
                  onChange={() => completeTask(task)}
                  aria-label={t("dashboardPage.myTasks.completeAria", {
                    title: task.title,
                  })}
                />
              </span>
            </Tooltip>

            <div className={styles.body}>
              <span
                className={`${styles.title} ${isCompleting ? styles.titleDone : ""}`}
                title={task.title}
              >
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

            <span
              className={styles.priority}
              style={{
                color: priorityColors[task.priority],
                borderColor: priorityColors[task.priority],
              }}
            >
              {t(`dashboardPage.priority.${task.priority}`)}
            </span>
          </li>
        );
      })}
    </WidgetCard>
  );
}
