import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Button, DatePicker, Empty, Select, Skeleton, Tag, Tooltip } from "antd";
import {
  CalendarOutlined,
  ClearOutlined,
  CloseOutlined,
  ColumnWidthOutlined,
  EyeOutlined,
  SaveOutlined,
  SettingOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Resizable, ResizeCallbackData } from "react-resizable";
import { useActivityLogEntry, useWorkspaceActivity } from "../hooks/useWorkspaceActivity";
import { workspaceService } from "@features/workspaces/services/workspaceService";
import ActivityDetailDrawer from "../components/ActivityDetailDrawer";
import SimplePagination from "@components/ui/SimplePagination";
import ColumnsModal from "@components/ui/ColumnsModal";
import ActivityViewModal from "../components/ActivityViewModal";
import { useSaveTableSettings, useTableSettings } from "@features/tableSettings/hooks/useTableSettings";
import { ActivityLog, WorkspaceMember } from "@types/index";
import {
  ACTION_CATEGORY_COLORS,
  ACTION_CATEGORY_ICONS,
  ACTIVITY_MODULES,
  ActivityModule,
  getActionCategory,
  getActionsForModule,
} from "../utils/activityMeta";
import {
  ColumnId,
  ColumnSetting,
  DEFAULT_COLUMNS,
  DEFAULT_COLUMN_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  COLUMN_LABEL_KEYS,
  columnWidthCss,
  normalizeColumns,
} from "../utils/activityColumns";
import { ActivityViewId, DEFAULT_ACTIVITY_VIEW } from "../utils/activityViews";
import styles from "./ActivityLogPage.module.css";

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

// page size, table view, and columns (visibility, order, width) all live in
// the same `table-settings` collection My Tasks uses — just a different
// `key`, one document per user per table (see backend's Table Settings
// Module Notes)
const TABLE_SETTINGS_KEY = "activityLog";

export default function ActivityLogPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [module, setModule] = useState<ActivityModule | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  // `?logId=<id>` is the single source of truth for which entry's drawer is
  // open — same pattern as the board's `?task=`. It also powers the
  // dashboard's Recent Activity widget deep-linking straight to one entry.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLogId = searchParams.get("logId");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [tableView, setTableView] = useState<ActivityViewId>(DEFAULT_ACTIVITY_VIEW);
  const [columns, setColumns] = useState<ColumnSetting[]>(DEFAULT_COLUMNS);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [resizeMode, setResizeMode] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnSetting[]>(DEFAULT_COLUMNS);
  const [touchedColumns, setTouchedColumns] = useState<Set<ColumnId>>(new Set());

  const { data: savedSettings, isFetched: settingsFetched } = useTableSettings(TABLE_SETTINGS_KEY);
  const { mutate: saveSettings } = useSaveTableSettings(TABLE_SETTINGS_KEY);
  const appliedSavedSettings = useRef(false);

  // apply the saved settings once, the first time they arrive — same guard
  // pattern as MyTasksPage, so the initial defaults don't get saved over
  // the user's real settings before they load
  useEffect(() => {
    if (!settingsFetched || appliedSavedSettings.current) return;
    appliedSavedSettings.current = true;

    if (savedSettings?.tableView) setTableView(savedSettings.tableView as ActivityViewId);
    if (savedSettings?.columns) setColumns(normalizeColumns(savedSettings.columns));
    if (savedSettings?.pageSize) setPageSize(savedSettings.pageSize);
  }, [settingsFetched, savedSettings]);

  // pageSize is a plain toolbar control (not modal-driven), so it saves
  // straight away, same as MyTasksPage
  useEffect(() => {
    if (!appliedSavedSettings.current) return;
    saveSettings({ pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const handleSelectTableView = (view: string) => {
    setTableView(view as ActivityViewId);
    saveSettings({ tableView: view });
  };

  // the columns modal stays open across many toggles/drags; only persist
  // once, with whatever the final arrangement is, when it's closed
  const handleCloseColumnsModal = () => {
    setColumnsModalOpen(false);
    saveSettings({ columns });
  };

  // ─── Column resize mode ──────────────────────────────────────────
  // same "measure the real rendered width first" approach as My Tasks —
  // see that page's handleEnterResizeMode for the full rationale
  const handleEnterResizeMode = () => {
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
    const original = new Map(columns.map((c) => [c.id, c.width]));
    const finalColumns = draftColumns.map((c) =>
      touchedColumns.has(c.id) ? c : { ...c, width: original.get(c.id) },
    );
    setColumns(finalColumns);
    saveSettings({ columns: finalColumns });
    setResizeMode(false);
  };

  const handleCancelResize = () => setResizeMode(false);

  // any filter (or page size) change invalidates the current page
  useEffect(() => {
    setPage(1);
  }, [userId, module, action, dateRange, pageSize]);

  const { data: members } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId ?? ""),
    enabled: !!workspaceId,
  });

  const { data, isLoading, isPlaceholderData } = useWorkspaceActivity(workspaceId ?? "", {
    page,
    limit: pageSize,
    userId: userId ?? undefined,
    module: module ?? undefined,
    action: action ?? undefined,
    dateFrom: dateRange?.[0]?.startOf("day").toISOString(),
    dateTo: dateRange?.[1]?.endOf("day").toISOString(),
  });

  const logs = data?.items ?? [];
  const meta = data?.meta;

  // The clicked row is almost always already in `logs` (no extra request);
  // a deep link from elsewhere (the dashboard) may name an entry that isn't
  // on this page's current filtered/paged view, so that case falls back to
  // fetching it directly by id.
  const logFromList = logs.find((l) => l._id === selectedLogId) ?? null;
  const { data: fetchedLog } = useActivityLogEntry(
    workspaceId ?? "",
    logFromList ? undefined : (selectedLogId ?? undefined),
  );
  const selectedLog = logFromList ?? fetchedLog ?? null;

  const openLogDrawer = (logId: string) => {
    setSearchParams((params) => {
      params.set("logId", logId);
      return params;
    });
  };

  const closeLogDrawer = () => {
    setSearchParams(
      (params) => {
        params.delete("logId");
        return params;
      },
      { replace: true },
    );
  };

  const hasFilters = !!(userId || module || action || dateRange);
  const clearFilters = () => {
    setUserId(null);
    setModule(null);
    setAction(null);
    setDateRange(null);
  };

  const actionOptions = ACTIVITY_MODULES.flatMap((m) =>
    getActionsForModule(m).map((a) => ({ value: a, label: t(`activityLogPage.action.${a}`, a) })),
  );

  const visibleColumns = (resizeMode ? draftColumns : columns).filter((c) => c.visible);
  const gridTemplateColumns = `${visibleColumns.map((c) => columnWidthCss(c)).join(" ")} 56px`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("activityLogPage.title")}</h1>
          <p className={styles.pageSubtitle}>{t("activityLogPage.subtitle")}</p>
        </div>
        {data?.meta && (
          <span className={styles.totalBadge}>
            {t("activityLogPage.totalCount", { count: data.meta.total })}
          </span>
        )}
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("activityLogPage.filterUser")}</span>
          <Select
            allowClear
            placeholder={t("activityLogPage.filterUser")}
            className={styles.filterControl}
            value={userId}
            onChange={setUserId}
            options={members?.map((m) => ({ value: m.userId._id, label: m.userId.name }))}
          />
        </div>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("activityLogPage.filterModule")}</span>
          <Select
            allowClear
            placeholder={t("activityLogPage.filterModule")}
            className={styles.filterControl}
            value={module}
            onChange={(v) => {
              setModule(v);
              setAction(null); // module changed — the previously selected action may not belong to it anymore
            }}
            options={ACTIVITY_MODULES.map((m) => ({ value: m, label: t(`activityLogPage.module.${m}`) }))}
          />
        </div>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("activityLogPage.filterAction")}</span>
          <Select
            allowClear
            placeholder={t("activityLogPage.filterAction")}
            className={styles.filterControl}
            value={action}
            onChange={setAction}
            options={module ? actionOptions.filter((o) => getActionsForModule(module).includes(o.value)) : actionOptions}
          />
        </div>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("activityLogPage.filterDateRange")}</span>
          <RangePicker
            className={styles.filterControl}
            suffixIcon={<CalendarOutlined />}
            value={dateRange}
            onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
          />
        </div>
        {hasFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters} className={styles.clearBtn}>
            {t("activityLogPage.clearFilters")}
          </Button>
        )}

        <div className={styles.toolbarRight}>
          <div className={styles.pageSizeField}>
            <span className={styles.filterLabel}>{t("activityLogPage.perPage")}</span>
            <Select value={pageSize} style={{ width: 90 }} onChange={setPageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Select.Option key={size} value={size}>
                  {size}
                </Select.Option>
              ))}
            </Select>
          </div>

          <Button icon={<TableOutlined />} onClick={() => setViewModalOpen(true)}>
            {t("activityLogPage.customizeTable")}
          </Button>

          <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>
            {t("activityLogPage.customizeColumns")}
          </Button>

          {resizeMode ? (
            <>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveResize}>
                {t("activityLogPage.saveWidths")}
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelResize}>
                {t("activityLogPage.cancelResize")}
              </Button>
            </>
          ) : (
            <Button icon={<ColumnWidthOutlined />} onClick={handleEnterResizeMode}>
              {t("activityLogPage.resizeColumns")}
            </Button>
          )}
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className={styles.tableScroll}
        style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
      >
        <div className={styles[`table_${tableView}`] ?? styles.table}>
          <div
            className={`${styles[`row_${tableView}`] ?? styles.row} ${styles.rowHeader}`}
            style={{ gridTemplateColumns }}
          >
            {visibleColumns.map((c) => {
              if (!resizeMode) {
                return (
                  <span key={c.id} data-column-id={c.id}>
                    {t(COLUMN_LABEL_KEYS[c.id])}
                  </span>
                );
              }

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
                    handleColumnResize(c.id, Math.round(data.size.width))
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
            <span></span>
          </div>

          {isLoading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 5 }} />
            </div>
          ) : logs.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("activityLogPage.empty")}
              style={{ padding: "48px 0" }}
            />
          ) : (
            logs.map((log, i) => (
              <ActivityRow
                key={log._id}
                log={log}
                members={members}
                columns={visibleColumns}
                gridTemplateColumns={gridTemplateColumns}
                variant={tableView}
                striped={tableView === "striped" && i % 2 === 1}
                resizable={resizeMode}
                onView={() => openLogDrawer(log._id)}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {meta && meta.total > 0 && (
        <div className={styles.pagination}>
          <SimplePagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
        </div>
      )}

      <ActivityDetailDrawer log={selectedLog} members={members} onClose={closeLogDrawer} />

      <ActivityViewModal
        open={viewModalOpen}
        value={tableView}
        onSelect={handleSelectTableView}
        onClose={() => setViewModalOpen(false)}
      />

      <ColumnsModal
        open={columnsModalOpen}
        title={t("activityLogPage.columnsModalTitle")}
        hint={t("activityLogPage.columnsModalHint")}
        columns={columns}
        labels={Object.fromEntries(
          (Object.keys(COLUMN_LABEL_KEYS) as ColumnId[]).map((id) => [id, t(COLUMN_LABEL_KEYS[id])]),
        )}
        onChange={setColumns}
        onClose={handleCloseColumnsModal}
      />
    </div>
  );
}

function ActivityRow({
  log,
  members,
  columns,
  gridTemplateColumns,
  variant,
  striped,
  resizable,
  onView,
  t,
}: {
  log: ActivityLog;
  members?: WorkspaceMember[];
  columns: ColumnSetting[];
  gridTemplateColumns: string;
  variant: ActivityViewId;
  striped: boolean;
  resizable: boolean;
  onView: () => void;
  t: TFunction;
}) {
  const category = getActionCategory(log.action);
  const Icon = ACTION_CATEGORY_ICONS[category];
  const module = log.module; // now stored on the log itself — see the backend's Activity Module Notes
  const task = typeof log.taskId === "object" ? log.taskId : null;
  const project = typeof log.projectId === "object" ? log.projectId : null;
  const role = members?.find((m) => m.userId._id === log.actorId?._id)?.role;

  const renderCell = (columnId: ColumnId) => {
    switch (columnId) {
      case "user":
        return (
          <span className={styles.userCell}>
            <Avatar size={32} style={{ background: "#4a6cf7", fontSize: 13, flexShrink: 0 }}>
              {log.actorId?.name?.[0]?.toUpperCase()}
            </Avatar>
            <span className={styles.userText}>
              <span className={styles.userName}>{log.actorId?.name}</span>
              {role && <span className={styles.userRole}>{t(`members.role.${role}`)}</span>}
            </span>
          </span>
        );
      case "module":
        return module && <Tag className={styles.moduleTag}>{t(`activityLogPage.module.${module}`)}</Tag>;
      case "action":
        return (
          <span className={`${styles.actionBadge} ${styles[`actionBadge_${category}`]}`}>
            <Icon />
            {t(`activityLogPage.action.${log.action}`, log.action)}
          </span>
        );
      case "context":
        return (
          <span className={styles.contextCell}>
            {project?.name && <span className={styles.contextPrimary}>{project.name}</span>}
            {task?.title && <span className={styles.contextSecondary}>{task.title}</span>}
          </span>
        );
      case "date":
        return (
          <span className={styles.dateCell}>
            <span className={styles.dateRelative}>{dayjs(log.createdAt).fromNow()}</span>
            <span className={styles.dateAbsolute}>{dayjs(log.createdAt).format("DD MMM YYYY • HH:mm")}</span>
          </span>
        );
    }
  };

  const colorfulStyle =
    variant === "colorful" ? { borderLeft: `3px solid ${ACTION_CATEGORY_COLORS[category]}` } : undefined;

  return (
    <div
      className={`${styles[`row_${variant}`] ?? styles.row} ${striped ? styles.rowStriped : ""} ${resizable ? styles.rowResizing : ""}`}
      style={{ gridTemplateColumns, ...colorfulStyle }}
      onClick={() => !resizable && onView()}
      role="button"
      tabIndex={0}
    >
      {columns.map((c) => (
        <span key={c.id}>{renderCell(c.id)}</span>
      ))}
      <span className={styles.viewCell}>
        <Tooltip title={t("activityLogPage.viewDetails")}>
          <Button
            icon={<EyeOutlined />}
            type="text"
            shape="circle"
            className={styles.viewBtn}
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          />
        </Tooltip>
      </span>
    </div>
  );
}
