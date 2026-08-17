import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Empty, Input, Select, Skeleton } from "antd";
import {
  ClearOutlined,
  ColumnWidthOutlined,
  CloseOutlined,
  SaveOutlined,
  SearchOutlined,
  TableOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMyTasks } from "../hooks/useMyTasks";
import { useProject, useProjects } from "@features/projects/hooks/useProjects";
import {
  useSaveTableSettings,
  useTableSettings,
} from "@features/tableSettings/hooks/useTableSettings";
import { Task, Priority } from "@types/index";
import TaskDetailModal from "../components/TaskDetailModal";
import TaskListView, {
  ColumnId,
  ColumnSetting,
  DEFAULT_COLUMN_WIDTH_PX,
  DEFAULT_COLUMNS,
  DEFAULT_TABLE_VIEW,
  TableViewId,
  isRowTableVariant,
  normalizeColumns,
} from "../components/TaskListViews";
import TableViewModal from "../components/TableViewModal";
import TableColumnsModal from "../components/TableColumnsModal";
import SimplePagination from "@components/ui/SimplePagination";
import styles from "./MyTasksPage.module.css";

const TABLE_SETTINGS_KEY = "myTasks";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

// debounce a fast-changing value (search/status text inputs) so we don't
// fire a request on every keystroke
function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function MyTasksPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [tableView, setTableView] = useState<TableViewId>(DEFAULT_TABLE_VIEW);
  const [columns, setColumns] = useState<ColumnSetting[]>(DEFAULT_COLUMNS);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [resizeMode, setResizeMode] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnSetting[]>(DEFAULT_COLUMNS);
  const [touchedColumns, setTouchedColumns] = useState<Set<ColumnId>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Table preferences (view style, page size, column visibility/order) are
  // saved per-user on the backend (`table-settings` collection) rather than
  // localStorage, so they follow the user across browsers/devices.
  const { data: savedSettings, isFetched: settingsFetched } = useTableSettings(TABLE_SETTINGS_KEY);
  const { mutate: saveSettings } = useSaveTableSettings(TABLE_SETTINGS_KEY);
  const appliedSavedSettings = useRef(false);

  // apply the saved settings once, the first time they arrive — after that
  // this effect must not run again or it would stomp the user's live edits
  useEffect(() => {
    if (!settingsFetched || appliedSavedSettings.current) return;
    appliedSavedSettings.current = true;

    if (savedSettings?.tableView) setTableView(savedSettings.tableView as TableViewId);
    if (savedSettings?.pageSize) setPageSize(savedSettings.pageSize);
    if (savedSettings?.columns) setColumns(normalizeColumns(savedSettings.columns));
  }, [settingsFetched, savedSettings]);

  // pageSize is a plain toolbar control (not modal-driven), so it saves
  // straight away. tableView and columns are edited inside modals — those
  // save once, when the modal is closed/finalized (see handlers below),
  // instead of firing a request per click/drag while the modal is open.
  useEffect(() => {
    if (!appliedSavedSettings.current) return;
    saveSettings({ pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  // the view modal selects and closes in the same click — pass the new
  // value straight through instead of reading `tableView` state, which
  // wouldn't have re-rendered yet
  const handleSelectTableView = (view: TableViewId) => {
    setTableView(view);
    saveSettings({ tableView: view });
  };

  // the columns modal stays open across many toggles/drags; only persist
  // once, with whatever the final arrangement is, when it's closed
  const handleCloseColumnsModal = () => {
    setColumnsModalOpen(false);
    saveSettings({ columns });
  };

  // ─── Column resize mode ────────────────────────────────────────
  // Same "batch, don't spam" idea as the columns modal, but there's no
  // modal here — resizing happens directly on the table, so a working copy
  // (draftColumns) absorbs every drag live, and only the explicit Save
  // button (top toolbar) commits it to `columns` + the backend.
  const handleEnterResizeMode = () => {
    // Give every column an explicit pixel width for the duration of the
    // session — react-resizable computes each drag as `controlledWidth +
    // mouseDelta`, with no idea what actually rendered. A column left on
    // its fluid "1fr" default would have a real on-screen width nothing
    // like our fallback number, so the very first pixel of drag would
    // snap it to the wrong size ("runs away" from the cursor").
    //
    // Rather than seed that pixel width from the small, fixed
    // DEFAULT_COLUMN_WIDTH_PX table (which made the whole table visibly
    // shrink the instant resize mode turned on — columns snapping to those
    // small defaults instead of whatever width they'd actually stretched
    // to), measure each currently-rendered header cell's real width first.
    // That makes turning resize mode on/off visually seamless, and only
    // columns nobody has ever measured (nothing rendered yet) fall back to
    // the fixed table at all.
    const container = tableContainerRef.current;
    const measured: Partial<Record<ColumnId, number>> = {};
    if (container) {
      for (const c of columns) {
        const el = container.querySelector(`[data-column-id="${c.id}"]`);
        if (el) measured[c.id] = Math.round(el.getBoundingClientRect().width);
      }
    }

    setDraftColumns(
      columns.map((c) => ({
        ...c,
        width: c.width ?? measured[c.id] ?? DEFAULT_COLUMN_WIDTH_PX[c.id],
      })),
    );
    setTouchedColumns(new Set());
    setResizeMode(true);
  };

  const handleColumnResize = (id: ColumnId, width: number) => {
    setDraftColumns((prev) => prev.map((c) => (c.id === id ? { ...c, width } : c)));
    setTouchedColumns((prev) => new Set(prev).add(id));
  };

  const handleSaveResize = () => {
    // Only columns the user actually dragged keep their new pixel width.
    // Everything else reverts to how it was before entering resize mode —
    // e.g. an untouched Title column stays fluid ("1fr") instead of being
    // permanently pinned to the session's fallback width.
    const original = new Map(columns.map((c) => [c.id, c.width]));
    const finalColumns = draftColumns.map((c) =>
      touchedColumns.has(c.id) ? c : { ...c, width: original.get(c.id) },
    );

    setColumns(finalColumns);
    saveSettings({ columns: finalColumns });
    setResizeMode(false);
  };

  const handleCancelResize = () => {
    setResizeMode(false);
  };

  const debouncedSearch = useDebounced(searchQuery);
  const debouncedStatus = useDebounced(statusFilter);

  // any filter change invalidates the current page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus, priorityFilter, projectFilter, pageSize]);

  const { data, isLoading, isPlaceholderData } = useMyTasks(workspaceId ?? "", {
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: debouncedStatus || undefined,
    priority: (priorityFilter as Priority) || undefined,
    projectId: projectFilter || undefined,
  });
  const { data: projects = [] } = useProjects(workspaceId ?? "");

  const tasks = data?.items ?? [];
  const meta = data?.meta;

  // Derived from the live query cache (not a snapshot) so the modal always
  // reflects the latest saved fields — see "Keeping modal data fresh" in
  // CLAUDE.md. A stale snapshot here would leave the Save/Cancel buttons
  // stuck visible after a successful edit, since `hasChanges` inside the
  // modal keeps comparing against the pre-edit `task` prop.
  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t._id === selectedTaskId) ?? null)
    : null;

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
    setStatusFilter("");
    setPriorityFilter(null);
    setProjectFilter(null);
  };

  // get project name for a task
  const getProjectName = (task: Task) => {
    const project = projects.find((p) => p._id === task.projectId);
    return project ? `${project.key} — ${project.name}` : "—";
  };

  if (isLoading) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>{t("myTasksPage.title")}</h1>
        </div>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{t("myTasksPage.title")}</h1>
          <p className={styles.subtitle}>
            {t("myTasksPage.subtitle", { count: meta?.total ?? 0 })}
          </p>
        </div>
        {meta && (
          <span className={styles.totalBadge}>
            {t("myTasksPage.totalBadge", { count: meta.total })}
          </span>
        )}
      </div>

      {/* Filters + table customization */}
      <div className={styles.filters}>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("myTasksPage.searchPlaceholder")}</span>
          <Input
            allowClear
            placeholder={t("myTasksPage.searchPlaceholder")}
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 220 }}
          />
        </div>

        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("myTasksPage.allStatuses")}</span>
          <Input
            allowClear
            placeholder={t("myTasksPage.allStatuses")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160 }}
          />
        </div>

        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("myTasksPage.allPriorities")}</span>
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
        </div>

        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("myTasksPage.allProjects")}</span>
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
        </div>

        {hasActiveFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters}>
            {t("myTasksPage.clearFilters")}
          </Button>
        )}

        <div className={styles.filtersRight}>
          <div className={styles.filterField}>
            <span className={styles.pageSizeLabel}>{t("myTasksPage.perPage")}</span>
            <Select value={pageSize} style={{ width: 90 }} onChange={setPageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Select.Option key={size} value={size}>
                  {size}
                </Select.Option>
              ))}
            </Select>
          </div>

          <Button icon={<TableOutlined />} onClick={() => setViewModalOpen(true)}>
            {t("tableViews.customizeTable")}
          </Button>

          {isRowTableVariant(tableView) && (
            <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>
              {t("tableColumns.customizeColumns")}
            </Button>
          )}

          {isRowTableVariant(tableView) &&
            (resizeMode ? (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveResize}>
                  {t("tableColumns.saveWidths")}
                </Button>
                <Button icon={<CloseOutlined />} onClick={handleCancelResize}>
                  {t("tableColumns.cancelResize")}
                </Button>
              </>
            ) : (
              <Button icon={<ColumnWidthOutlined />} onClick={handleEnterResizeMode}>
                {t("tableColumns.resizeColumns")}
              </Button>
            ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("myTasksPage.emptyDescription")}
          />
        </div>
      ) : (
        <div
          ref={tableContainerRef}
          style={{ opacity: isPlaceholderData ? 0.6 : 1, transition: "opacity 0.15s" }}
        >
          <TaskListView
            variant={tableView}
            tasks={tasks}
            columns={resizeMode ? draftColumns : columns}
            getProjectName={getProjectName}
            onTaskClick={(task) => setSelectedTaskId(task._id)}
            emptyDescription={t("myTasksPage.emptyDescription")}
            resizable={resizeMode}
            onColumnResize={handleColumnResize}
          />
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className={styles.pagination}>
          <SimplePagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </div>
      )}

      {/* Table view picker */}
      <TableViewModal
        open={viewModalOpen}
        value={tableView}
        onSelect={handleSelectTableView}
        onClose={() => setViewModalOpen(false)}
      />

      {/* Column visibility/order picker */}
      <TableColumnsModal
        open={columnsModalOpen}
        columns={columns}
        onChange={setColumns}
        onClose={handleCloseColumnsModal}
      />

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          key={selectedTask._id}
          task={selectedTask}
          workspaceId={workspaceId ?? ""}
          projectId={selectedTask.projectId}
          statuses={selectedTaskProject?.statuses.map((s) => s.name) ?? []}
          open={!!selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
