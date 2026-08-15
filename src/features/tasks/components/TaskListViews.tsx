import { Avatar, Empty, Tag } from "antd";
import { CalendarOutlined, UserOutlined } from "@ant-design/icons";
import { Resizable, ResizeCallbackData } from "react-resizable";
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

// variants that render as a literal rows-and-columns table — these are the
// only ones column visibility/order applies to. "cards" and "kanban" lay
// tasks out as cards, not columns.
const ROW_TABLE_VARIANTS: TableViewId[] = [
  "classic",
  "compact",
  "spreadsheet",
  "minimal",
  "colorful",
  "avatar",
  "striped",
];

export function isRowTableVariant(variant: TableViewId): boolean {
  return ROW_TABLE_VARIANTS.includes(variant);
}

// ─── Column customization ──────────────────────────────────────────
export type ColumnId =
  | "taskKey"
  | "title"
  | "project"
  | "status"
  | "dueDate"
  | "priority";

export interface ColumnSetting {
  id: ColumnId;
  visible: boolean;
  // saved width in pixels, set once the user drags a resize handle; unset
  // means "use this view's default width" (below)
  width?: number | null;
}

export const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: "taskKey", visible: true },
  { id: "title", visible: true },
  { id: "project", visible: true },
  { id: "status", visible: true },
  { id: "dueDate", visible: true },
  { id: "priority", visible: true },
];

export const COLUMN_LABEL_KEYS: Record<ColumnId, string> = {
  taskKey: "myTasksPage.columnKey",
  title: "myTasksPage.columnTitle",
  project: "myTasksPage.columnProject",
  status: "myTasksPage.columnStatus",
  dueDate: "myTasksPage.columnDueDate",
  priority: "myTasksPage.columnPriority",
};

const COLUMN_WIDTHS: Record<ColumnId, string> = {
  taskKey: "90px",
  title: "1fr",
  project: "160px",
  status: "120px",
  dueDate: "120px",
  priority: "100px",
};

// numeric fallback used as the resize handle's starting width for columns
// that haven't been manually resized yet (title has no pixel default above
// since it's fluid — 1fr — until the user drags it)
export const DEFAULT_COLUMN_WIDTH_PX: Record<ColumnId, number> = {
  taskKey: 90,
  title: 280,
  project: 160,
  status: 120,
  dueDate: 120,
  priority: 100,
};

export const MIN_COLUMN_WIDTH_PX = 60;

function columnWidthCss(c: ColumnSetting): string {
  return c.width ? `${c.width}px` : COLUMN_WIDTHS[c.id];
}

// merge a saved column list with DEFAULT_COLUMNS so a newly added column
// (e.g. a future release) still shows up for users with an old saved order
export function normalizeColumns(
  saved:
    | { id: string; visible: boolean; width?: number | null }[]
    | undefined
    | null,
): ColumnSetting[] {
  if (!saved || saved.length === 0) return DEFAULT_COLUMNS;
  const known = new Set(DEFAULT_COLUMNS.map((c) => c.id as string));
  const savedIds = new Set(saved.map((c) => c.id));
  const merged = saved.filter((c) => known.has(c.id)) as ColumnSetting[];
  for (const col of DEFAULT_COLUMNS) {
    if (!savedIds.has(col.id)) merged.push(col);
  }
  return merged;
}

interface TaskListViewProps {
  variant: TableViewId;
  tasks: Task[];
  columns?: ColumnSetting[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
  emptyDescription: string;
  // column-resize mode — header cells grow drag handles, and dragging one
  // reports the new width instead of the row click firing
  resizable?: boolean;
  onColumnResize?: (id: ColumnId, width: number) => void;
}

export default function TaskListView({
  variant,
  tasks,
  columns = DEFAULT_COLUMNS,
  getProjectName,
  onTaskClick,
  emptyDescription,
  resizable = false,
  onColumnResize,
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

  const visibleColumns = columns.filter((c) => c.visible);
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

            <RowsTable
              variant={variant}
              tasks={groupTasks}
              columns={visibleColumns}
              getProjectName={getProjectName}
              onTaskClick={onTaskClick}
              resizable={resizable}
              onColumnResize={onColumnResize}
            />
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
  columns,
  getProjectName,
  onTaskClick,
  resizable = false,
  onColumnResize,
}: {
  variant: TableViewId;
  tasks: Task[];
  columns: ColumnSetting[];
  getProjectName: (task: Task) => string;
  onTaskClick: (task: Task) => void;
  resizable?: boolean;
  onColumnResize?: (id: ColumnId, width: number) => void;
}) {
  const { t } = useTranslation();
  const showAvatar = variant === "avatar";
  const gridTemplateColumns = columns.map((c) => columnWidthCss(c)).join(" ");

  const renderCell = (task: Task, columnId: ColumnId) => {
    switch (columnId) {
      case "taskKey":
        return <span className={styles.taskKey}>#{task.taskNumber}</span>;
      case "title":
        return (
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
        );
      case "project":
        return <span className={styles.projectName}>{getProjectName(task)}</span>;
      case "status":
        return (
          <span>
            <Tag style={{ fontSize: 12 }}>{task.status}</Tag>
          </span>
        );
      case "dueDate": {
        const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");
        return (
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
        );
      }
      case "priority":
        return (
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
        );
    }
  };

  return (
    <div className={styles.tableScroll}>
      <div className={styles[`table_${variant}`] ?? styles.table}>
        <div
          className={`${styles[`row_${variant}`] ?? styles.row} ${styles.rowHeader}`}
          style={{ gridTemplateColumns }}
        >
          {columns.map((c) => {
            if (!resizable) {
              return (
                <span key={c.id} data-column-id={c.id}>
                  {t(COLUMN_LABEL_KEYS[c.id])}
                </span>
              );
            }

            // react-resizable computes each drag's new width as
            // `controlledWidth + mouseDeltaX` — it has no idea what the DOM
            // actually rendered. If the `width` we pass it doesn't exactly
            // match the cell's real on-screen width (e.g. a CSS Grid "1fr"
            // track, which is almost never the same number), the very first
            // pixel of drag snaps the column to a completely different size
            // and the handle "runs away" from the cursor. Pinning an
            // explicit inline width on the cell — matching what we pass to
            // Resizable exactly — guarantees the two stay in sync.
            const baseWidth = c.width ?? DEFAULT_COLUMN_WIDTH_PX[c.id];

            return (
              <Resizable
                key={c.id}
                width={baseWidth}
                height={0}
                axis="x"
                minConstraints={[MIN_COLUMN_WIDTH_PX, 0]}
                resizeHandles={["e"]}
                onResize={(_e: unknown, data: ResizeCallbackData) =>
                  onColumnResize?.(c.id, Math.round(data.size.width))
                }
                handle={<span className={styles.resizeHandle} />}
              >
                <span
                  className={styles.resizableHeaderCell}
                  style={{ width: baseWidth, minWidth: baseWidth, maxWidth: baseWidth }}
                >
                  {t(COLUMN_LABEL_KEYS[c.id])}
                </span>
              </Resizable>
            );
          })}
        </div>

        {tasks.map((task, i) => {
          const rowClass = styles[`row_${variant}`] ?? styles.row;
          const striped = variant === "striped" && i % 2 === 1 ? styles.rowStriped : "";
          const colorfulStyle =
            variant === "colorful" ? { borderLeft: `3px solid ${priorityColors[task.priority]}` } : undefined;

          return (
            <div
              key={task._id}
              className={`${rowClass} ${striped} ${resizable ? styles.rowResizing : ""}`}
              style={{ gridTemplateColumns, ...colorfulStyle }}
              onClick={() => !resizable && onTaskClick(task)}
            >
              {columns.map((c) => (
                <span key={c.id} style={{ display: "contents" }}>
                  {renderCell(task, c.id)}
                </span>
              ))}
            </div>
          );
        })}
      </div>
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
