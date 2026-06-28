import { useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Empty, Select, Skeleton, Tag, Tooltip } from "antd";
import { CalendarOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMyTasks } from "../hooks/useMyTasks";
import { useProjects } from "@features/projects/hooks/useProjects";
import { Task, Priority } from "@types/index";
import TaskDetailModal from "../components/TaskDetailModal";
import styles from "./MyTasksPage.module.css";

const priorityColors: Record<Priority, string> = {
  [Priority.CRITICAL]: "#f5222d",
  [Priority.HIGH]: "#fa8c16",
  [Priority.MEDIUM]: "#4a6cf7",
  [Priority.LOW]: "#8c8c8c",
};

type GroupKey = "overdue" | "today" | "this_week" | "later" | "no_date";

const groups: { key: GroupKey; label: string; color: string }[] = [
  { key: "overdue", label: "Overdue", color: "#f5222d" },
  { key: "today", label: "Today", color: "#fa8c16" },
  { key: "this_week", label: "This Week", color: "#4a6cf7" },
  { key: "later", label: "Later", color: "#10B981" },
  { key: "no_date", label: "No Due Date", color: "#8c8c8c" },
];

function getGroup(task: Task): GroupKey {
  if (!task.dueDate) return "no_date";
  const due = dayjs(task.dueDate);
  const today = dayjs().startOf("day");

  if (due.isBefore(today)) return "overdue";
  if (due.isSame(today, "day")) return "today";
  if (due.isBefore(today.add(7, "day"))) return "this_week";
  return "later";
}

export default function MyTasksPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useMyTasks(workspaceId ?? "");
  const { data: projects = [] } = useProjects(workspaceId ?? "");

  // filter tasks
  const filtered = tasks.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  // group by due date
  const grouped = groups.reduce<Record<GroupKey, Task[]>>(
    (acc, g) => {
      acc[g.key] = filtered.filter((t) => getGroup(t) === g.key);
      return acc;
    },
    { overdue: [], today: [], this_week: [], later: [], no_date: [] },
  );

  // get project name for a task
  const getProjectName = (task: Task) => {
    const project = projects.find((p) => p._id === task.projectId);
    return project ? `${project.key} — ${project.name}` : "—";
  };

  // get project statuses for the modal
  const getStatuses = (task: Task) => {
    const project = projects.find((p) => p._id === task.projectId);
    return project?.statuses.map((s) => s.name) ?? [];
  };

  // collect all unique statuses for filter dropdown
  const allStatuses = Array.from(new Set(tasks.map((t) => t.status)));

  if (isLoading) {
    return (
      <div>
        <div className={styles.header}>
          <h1 className={styles.title}>My Tasks</h1>
        </div>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>My Tasks</h1>
        <p className={styles.subtitle}>
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Select
          placeholder="All statuses"
          allowClear
          style={{ width: 140 }}
          size="small"
          onChange={(v) => setStatusFilter(v ?? null)}
        >
          {allStatuses.map((s) => (
            <Select.Option key={s} value={s}>
              {s}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="All priorities"
          allowClear
          style={{ width: 140 }}
          size="small"
          onChange={(v) => setPriorityFilter(v ?? null)}
        >
          <Select.Option value={Priority.CRITICAL}>🔴 Critical</Select.Option>
          <Select.Option value={Priority.HIGH}>🟠 High</Select.Option>
          <Select.Option value={Priority.MEDIUM}>🔵 Medium</Select.Option>
          <Select.Option value={Priority.LOW}>⚪ Low</Select.Option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No tasks assigned to you"
          />
        </div>
      ) : (
        groups.map((group) => {
          const groupTasks = grouped[group.key];
          if (groupTasks.length === 0) return null;

          return (
            <div key={group.key} className={styles.group}>
              {/* Group header */}
              <div className={styles.groupHeader}>
                <span
                  className={styles.groupDot}
                  style={{ background: group.color }}
                />
                <span className={styles.groupTitle}>{group.label}</span>
                <span className={styles.groupCount}>{groupTasks.length}</span>
              </div>

              {/* Table */}
              <div className={styles.table}>
                {/* Table header */}
                <div className={`${styles.row} ${styles.rowHeader}`}>
                  <span>Key</span>
                  <span>Title</span>
                  <span>Project</span>
                  <span>Status</span>
                  <span>Due Date</span>
                  <span>Priority</span>
                </div>

                {/* Task rows */}
                {groupTasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    dayjs(task.dueDate).isBefore(dayjs(), "day");

                  return (
                    <div
                      key={task._id}
                      className={styles.row}
                      onClick={() => setSelectedTask(task)}
                    >
                      <span className={styles.taskKey}>#{task.taskNumber}</span>

                      <span className={styles.taskTitle}>{task.title}</span>

                      <span className={styles.projectName}>
                        {getProjectName(task)}
                      </span>

                      <span>
                        <Tag style={{ fontSize: 11 }}>{task.status}</Tag>
                      </span>

                      <span
                        className={`${styles.dueDate} ${isOverdue ? styles.overdue : ""}`}
                      >
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
                            fontSize: 11,
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
            </div>
          );
        })
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workspaceId={workspaceId ?? ""}
          projectId={selectedTask.projectId}
          statuses={getStatuses(selectedTask)}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
