import { Avatar, Empty, Tag } from "antd";
import { CalendarOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Task } from "@types/index";
import {
  dueDateGroups,
  groupByDueDate,
  groupByStatus,
  priorityColors,
} from "../utils/taskGrouping";
import styles from "./TaskListViews.module.css";

export type TableViewId =
  | "classic"
  | "compact"
  | "spreadsheet"
  | "cards"
  | "minimal"
  | "colorful"
  | "avatar"
  | "striped"
  | "kanban";

export const TABLE_VIEWS: {
  id: TableViewId;
  labelKey: string;
  descKey: string;
}[] = [
  { id: "classic", labelKey: "tableViews.classic.name", descKey: "tableViews.classic.desc" },
  { id: "compact", labelKey: "tableViews.compact.name", descKey: "tableViews.compact.desc" },
  { id: "spreadsheet", labelKey: "tableViews.spreadsheet.name", descKey: "tableViews.spreadsheet.desc" },
  { id: "cards", labelKey: "tableViews.cards.name", descKey: "tableViews.cards.desc" },
  { id: "minimal", labelKey: "tableViews.minimal.name", descKey: "tableViews.minimal.desc" },
  { id: "colorful", labelKey: "tableViews.colorful.name", descKey: "tableViews.colorful.desc" },
  { id: "avatar", labelKey: "tableViews.avatar.name", descKey: "tableViews.avatar.desc" },
  { id: "striped", labelKey: "tableViews.striped.name", descKey: "tableViews.striped.desc" },
  { id: "kanban", labelKey: "tableViews.kanban.name", descKey: "tableViews.kanban.desc" },
];

export const DEFAULT_TABLE_VIEW: TableViewId = "classic";
export const TABLE_VIEW_STORAGE_KEY = "taskflow.myTasksTableView";

interface TaskListViewProps {
  variant: TableViewId;
  tasks: Task[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
  emptyDescription: string;
}

export default function TaskListView({
  variant,
  tasks,
  getProjectName,
  onTaskClick,
  emptyDescription,
}: TaskListViewProps) {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
      </div>
    );
  }

  if (variant === "kanban") {
    return <KanbanView tasks={tasks} getProjectName={getProjectName} onTaskClick={onTaskClick} />;
  }

  if (variant === "cards") {
    return <CardsView tasks={tasks} getProjectName={getProjectName} onTaskClick={onTaskClick} />;
  }

  const grouped = groupByDueDate(tasks);

  return (
    <div>
      {dueDateGroups.map((group) => {
        const groupTasks = grouped[group.key];
        if (groupTasks.length === 0) return null;

        return (
          <div key={group.key} className={styles[`group_${variant}`] ?? styles.group}>
            <div className={styles[`groupHeader_${variant}`] ?? styles.groupHeader}>
              <span className={styles.groupDot} style={{ background: group.color }} />
              <span className={styles.groupTitle}>{t(group.labelKey)}</span>
              <span className={styles.groupCount}>{groupTasks.length}</span>
            </div>

            <RowsTable variant={variant} tasks={groupTasks} getProjectName={getProjectName} onTaskClick={onTaskClick} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared rows-style table (used by classic / compact / spreadsheet /
// minimal / colorful / avatar / striped variants — layout is identical,
// only CSS module class names differ) ────────────────────────────────
function RowsTable({
  variant,
  tasks,
  getProjectName,
  onTaskClick,
}: {
  variant: TableViewId;
  tasks: Task[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
}) {
  const { t } = useTranslation();
  const showAvatar = variant === "avatar";

  return (
    <div className={styles[`table_${variant}`] ?? styles.table}>
      <div className={`${styles[`row_${variant}`] ?? styles.row} ${styles.rowHeader}`}>
        <span>{t("myTasksPage.columnKey")}</span>
        <span>{t("myTasksPage.columnTitle")}</span>
        <span>{t("myTasksPage.columnProject")}</span>
        <span>{t("myTasksPage.columnStatus")}</span>
        <span>{t("myTasksPage.columnDueDate")}</span>
        <span>{t("myTasksPage.columnPriority")}</span>
      </div>

      {tasks.map((task, i) => {
        const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");
        const rowClass = styles[`row_${variant}`] ?? styles.row;
        const striped = variant === "striped" && i % 2 === 1 ? styles.rowStriped : "";
        const colorfulStyle =
          variant === "colorful" ? { borderLeft: `3px solid ${priorityColors[task.priority]}` } : undefined;

        return (
          <div
            key={task._id}
            className={`${rowClass} ${striped}`}
            style={colorfulStyle}
            onClick={() => onTaskClick(task)}
          >
            <span className={styles.taskKey}>#{task.taskNumber}</span>

            <span className={styles.taskTitle}>
              {showAvatar && (
                <Avatar
                  size={22}
                  src={task.assigneeId?.avatarUrl ?? undefined}
                  icon={<UserOutlined />}
                  style={{ marginRight: 8, flexShrink: 0 }}
                />
              )}
              {task.title}
            </span>

            <span className={styles.projectName}>{getProjectName(task)}</span>

            <span>
              <Tag style={{ fontSize: 12 }}>{task.status}</Tag>
            </span>

            <span className={`${styles.dueDate} ${isOverdue ? styles.overdue : ""}`}>
              {task.dueDate ? (
                <>
                  <CalendarOutlined />
                  {dayjs(task.dueDate).format("MMM D")}
                </>
              ) : (
                <span style={{ color: "#bfbfbf" }}>—</span>
              )}
            </span>

            <span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: priorityColors[task.priority],
                }}
              >
                ● {task.priority}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cards grid variant ────────────────────────────────────────────
function CardsView({
  tasks,
  getProjectName,
  onTaskClick,
}: {
  tasks: Task[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
}) {
  return (
    <div className={styles.cardsGrid}>
      {tasks.map((task) => {
        const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");
        return (
          <div key={task._id} className={styles.taskCard} onClick={() => onTaskClick(task)}>
            <div className={styles.taskCardHeader}>
              <span className={styles.taskKey}>#{task.taskNumber}</span>
              <span
                className={styles.taskCardPriority}
                style={{ color: priorityColors[task.priority] }}
              >
                ● {task.priority}
              </span>
            </div>
            <div className={styles.taskCardTitle}>{task.title}</div>
            <div className={styles.taskCardMeta}>
              <span className={styles.projectName}>{getProjectName(task)}</span>
              <Tag style={{ fontSize: 11 }}>{task.status}</Tag>
            </div>
            <div className={`${styles.dueDate} ${isOverdue ? styles.overdue : ""}`}>
              {task.dueDate ? (
                <>
                  <CalendarOutlined />
                  {dayjs(task.dueDate).format("MMM D")}
                </>
              ) : (
                <span style={{ color: "#bfbfbf" }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban-by-status variant ──────────────────────────────────────
function KanbanView({
  tasks,
  getProjectName,
  onTaskClick,
}: {
  tasks: Task[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
}) {
  const columns = groupByStatus(tasks);

  return (
    <div className={styles.kanbanBoard}>
      {columns.map((col) => (
        <div key={col.status} className={styles.kanbanColumn}>
          <div className={styles.kanbanColumnHeader}>
            <span>{col.status}</span>
            <span className={styles.groupCount}>{col.tasks.length}</span>
          </div>
          <div className={styles.kanbanColumnBody}>
            {col.tasks.map((task) => {
              const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");
              return (
                <div key={task._id} className={styles.kanbanCard} onClick={() => onTaskClick(task)}>
                  <div className={styles.taskCardHeader}>
                    <span className={styles.taskKey}>#{task.taskNumber}</span>
                    <span
                      className={styles.taskCardPriority}
                      style={{ color: priorityColors[task.priority] }}
                    >
                      ● {task.priority}
                    </span>
                  </div>
                  <div className={styles.taskCardTitle}>{task.title}</div>
                  <div className={styles.taskCardMeta}>
                    <span className={styles.projectName}>{getProjectName(task)}</span>
                  </div>
                  <div className={`${styles.dueDate} ${isOverdue ? styles.overdue : ""}`}>
                    {task.dueDate ? (
                      <>
                        <CalendarOutlined />
                        {dayjs(task.dueDate).format("MMM D")}
                      </>
                    ) : (
                      <span style={{ color: "#bfbfbf" }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
