import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input, Select, Skeleton } from "antd";
import {
  ClearOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMyTasks } from "../hooks/useMyTasks";
import { useProject, useProjects } from "@features/projects/hooks/useProjects";
import { Task, Priority } from "@types/index";
import TaskDetailModal from "../components/TaskDetailModal";
import TaskListView, {
  DEFAULT_TABLE_VIEW,
  TABLE_VIEW_STORAGE_KEY,
  TableViewId,
} from "../components/TaskListViews";
import TableViewModal from "../components/TableViewModal";
import styles from "./MyTasksPage.module.css";

function loadStoredTableView(): TableViewId {
  try {
    const stored = localStorage.getItem(TABLE_VIEW_STORAGE_KEY);
    return (stored as TableViewId) || DEFAULT_TABLE_VIEW;
  } catch {
    return DEFAULT_TABLE_VIEW;
  }
}

export default function MyTasksPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [tableView, setTableView] = useState<TableViewId>(loadStoredTableView);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: tasks = [], isLoading } = useMyTasks(workspaceId ?? "");
  const { data: projects = [] } = useProjects(workspaceId ?? "");
  // The project list endpoint omits `statuses` (it's excluded for the
  // lightweight projects grid) — fetch the selected task's full project
  // separately so the detail modal gets a real status list.
  const { data: selectedTaskProject } = useProject(
    workspaceId ?? "",
    selectedTask?.projectId ?? "",
  );

  const hasActiveFilters =
    !!searchQuery || !!statusFilter || !!priorityFilter || !!projectFilter;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
    setPriorityFilter(null);
    setProjectFilter(null);
  };

  const handleSelectTableView = (view: TableViewId) => {
    setTableView(view);
    try {
      localStorage.setItem(TABLE_VIEW_STORAGE_KEY, view);
    } catch {
      // localStorage unavailable — selection just won't persist
    }
  };

  // filter tasks
  const query = searchQuery.trim().toLowerCase();
  const filtered = tasks.filter((t) => {
    if (
      query &&
      !t.title.toLowerCase().includes(query) &&
      !`${t.taskNumber}`.includes(query)
    ) {
      return false;
    }
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (projectFilter && t.projectId !== projectFilter) return false;
    return true;
  });

  // get project name for a task
  const getProjectName = (task: Task) => {
    const project = projects.find((p) => p._id === task.projectId);
    return project ? `${project.key} — ${project.name}` : "—";
  };

  // collect all unique statuses for filter dropdown
  const allStatuses = Array.from(new Set(tasks.map((t) => t.status)));

  if (isLoading) {
    return (
      <div>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("myTasksPage.title")}</h1>
        </div>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("myTasksPage.title")}</h1>
        <p className={styles.subtitle}>
          {t("myTasksPage.subtitle", { count: tasks.length })}
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Input
          allowClear
          placeholder={t("myTasksPage.searchPlaceholder")}
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 220 }}
        />

        <Select
          placeholder={t("myTasksPage.allStatuses")}
          allowClear
          value={statusFilter}
          style={{ width: 160 }}
          onChange={(v) => setStatusFilter(v ?? null)}
        >
          {allStatuses.map((s) => (
            <Select.Option key={s} value={s}>
              {s}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder={t("myTasksPage.allPriorities")}
          allowClear
          value={priorityFilter}
          style={{ width: 160 }}
          onChange={(v) => setPriorityFilter(v ?? null)}
        >
          <Select.Option value={Priority.CRITICAL}>
            {t("myTasksPage.priorityCritical")}
          </Select.Option>
          <Select.Option value={Priority.HIGH}>
            {t("myTasksPage.priorityHigh")}
          </Select.Option>
          <Select.Option value={Priority.MEDIUM}>
            {t("myTasksPage.priorityMedium")}
          </Select.Option>
          <Select.Option value={Priority.LOW}>
            {t("myTasksPage.priorityLow")}
          </Select.Option>
        </Select>

        <Select
          placeholder={t("myTasksPage.allProjects")}
          allowClear
          value={projectFilter}
          style={{ width: 200 }}
          onChange={(v) => setProjectFilter(v ?? null)}
        >
          {projects.map((p) => (
            <Select.Option key={p._id} value={p._id}>
              {p.key} — {p.name}
            </Select.Option>
          ))}
        </Select>

        {hasActiveFilters && (
          <Button icon={<ClearOutlined />} type="text" onClick={clearFilters}>
            {t("myTasksPage.clearFilters")}
          </Button>
        )}

        <Button
          icon={<TableOutlined />}
          onClick={() => setViewModalOpen(true)}
          style={{ marginLeft: "auto" }}
        >
          {t("tableViews.customizeTable")}
        </Button>
      </div>

      <TaskListView
        variant={tableView}
        tasks={filtered}
        getProjectName={getProjectName}
        onTaskClick={setSelectedTask}
        emptyDescription={t("myTasksPage.emptyDescription")}
      />

      {/* Table view picker */}
      <TableViewModal
        open={viewModalOpen}
        value={tableView}
        onSelect={handleSelectTableView}
        onClose={() => setViewModalOpen(false)}
      />

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workspaceId={workspaceId ?? ""}
          projectId={selectedTask.projectId}
          statuses={selectedTaskProject?.statuses.map((s) => s.name) ?? []}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
