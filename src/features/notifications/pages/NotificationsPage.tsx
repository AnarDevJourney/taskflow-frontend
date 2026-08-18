import { useEffect, useRef, useState } from "react";
import { Button, DatePicker, Empty, Select, Skeleton, Tooltip } from "antd";
import { CalendarOutlined, ClearOutlined, CloseOutlined, ColumnWidthOutlined, EyeOutlined, SaveOutlined, SettingOutlined, TableOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Resizable, ResizeCallbackData } from "react-resizable";
import { useNotificationsTable } from "../hooks/useNotificationsTable";
import { useNotifications } from "../hooks/useNotifications";
import { notificationIcon } from "../utils/notificationIcon";
import { renderNotificationText } from "../utils/notificationText";
import NotificationDetailDrawer from "../components/NotificationDetailDrawer";
import NotificationViewModal from "../components/NotificationViewModal";
import SimplePagination from "@components/ui/SimplePagination";
import ColumnsModal from "@components/ui/ColumnsModal";
import { useSaveTableSettings, useTableSettings } from "@features/tableSettings/hooks/useTableSettings";
import { Notification, NotificationType } from "@types/index";
import {
  ColumnId,
  ColumnSetting,
  DEFAULT_COLUMNS,
  DEFAULT_COLUMN_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  COLUMN_LABEL_KEYS,
  columnWidthCss,
  normalizeColumns,
} from "../utils/notificationColumns";
import { NotificationViewId, DEFAULT_NOTIFICATION_VIEW } from "../utils/notificationViews";
import styles from "./NotificationsPage.module.css";

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

// page size, table view, and columns (visibility, order, width) all live in
// the same `table-settings` collection Activity Log/My Tasks use — just a
// different `key`, one document per user per table
const TABLE_SETTINGS_KEY = "notifications";

const READ_STATUS_OPTIONS = ["read", "unread"] as const;

export default function NotificationsPage() {
  const { t } = useTranslation();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [readStatus, setReadStatus] = useState<(typeof READ_STATUS_OPTIONS)[number] | null>(null);
  const [type, setType] = useState<NotificationType | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [tableView, setTableView] = useState<NotificationViewId>(DEFAULT_NOTIFICATION_VIEW);
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
  // pattern as ActivityLogPage/MyTasksPage
  useEffect(() => {
    if (!settingsFetched || appliedSavedSettings.current) return;
    appliedSavedSettings.current = true;

    if (savedSettings?.tableView) setTableView(savedSettings.tableView as NotificationViewId);
    if (savedSettings?.columns) setColumns(normalizeColumns(savedSettings.columns));
    if (savedSettings?.pageSize) setPageSize(savedSettings.pageSize);
  }, [settingsFetched, savedSettings]);

  // pageSize is a plain toolbar control (not modal-driven), so it saves
  // straight away, same as ActivityLogPage
  useEffect(() => {
    if (!appliedSavedSettings.current) return;
    saveSettings({ pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const handleSelectTableView = (view: string) => {
    setTableView(view as NotificationViewId);
    saveSettings({ tableView: view });
  };

  // the columns modal stays open across many toggles/drags; only persist
  // once, with whatever the final arrangement is, when it's closed
  const handleCloseColumnsModal = () => {
    setColumnsModalOpen(false);
    saveSettings({ columns });
  };

  // ─── Column resize mode ──────────────────────────────────────────
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
  }, [readStatus, type, dateRange, pageSize]);

  const { markAsRead } = useNotifications();

  const { data, isLoading, isPlaceholderData } = useNotificationsTable({
    page,
    limit: pageSize,
    isRead: readStatus === "read" ? true : readStatus === "unread" ? false : undefined,
    type: type ?? undefined,
    dateFrom: dateRange?.[0]?.startOf("day").toISOString(),
    dateTo: dateRange?.[1]?.endOf("day").toISOString(),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const hasFilters = !!(readStatus || type || dateRange);
  const clearFilters = () => {
    setReadStatus(null);
    setType(null);
    setDateRange(null);
  };

  const typeOptions = Object.values(NotificationType).map((v) => ({
    value: v,
    label: t(`notificationsPage.type.${v}`, v),
  }));

  const handleView = (n: Notification) => {
    if (!n.isRead) markAsRead(n._id);
    setSelected(n);
  };

  const visibleColumns = (resizeMode ? draftColumns : columns).filter((c) => c.visible);
  const gridTemplateColumns = `${visibleColumns.map((c) => columnWidthCss(c)).join(" ")} 56px`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("notificationsPage.title")}</h1>
          <p className={styles.pageSubtitle}>{t("notificationsPage.subtitle")}</p>
        </div>
        {data?.meta && (
          <span className={styles.totalBadge}>{t("notificationsPage.totalCount", { count: data.meta.total })}</span>
        )}
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("notificationsPage.filterStatus")}</span>
          <Select
            allowClear
            placeholder={t("notificationsPage.filterStatus")}
            className={styles.filterControl}
            value={readStatus}
            onChange={setReadStatus}
            options={READ_STATUS_OPTIONS.map((s) => ({ value: s, label: t(`notificationsPage.${s}`) }))}
          />
        </div>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("notificationsPage.filterType")}</span>
          <Select
            allowClear
            placeholder={t("notificationsPage.filterType")}
            className={styles.filterControl}
            value={type}
            onChange={setType}
            options={typeOptions}
          />
        </div>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("notificationsPage.filterDateRange")}</span>
          <RangePicker
            className={styles.filterControl}
            suffixIcon={<CalendarOutlined />}
            value={dateRange}
            onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
          />
        </div>
        {hasFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters} className={styles.clearBtn}>
            {t("notificationsPage.clearFilters")}
          </Button>
        )}

        <div className={styles.toolbarRight}>
          <div className={styles.pageSizeField}>
            <span className={styles.filterLabel}>{t("notificationsPage.perPage")}</span>
            <Select value={pageSize} style={{ width: 90 }} onChange={setPageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Select.Option key={size} value={size}>
                  {size}
                </Select.Option>
              ))}
            </Select>
          </div>

          <Button icon={<TableOutlined />} onClick={() => setViewModalOpen(true)}>
            {t("notificationsPage.customizeTable")}
          </Button>

          <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>
            {t("notificationsPage.customizeColumns")}
          </Button>

          {resizeMode ? (
            <>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveResize}>
                {t("notificationsPage.saveWidths")}
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelResize}>
                {t("notificationsPage.cancelResize")}
              </Button>
            </>
          ) : (
            <Button icon={<ColumnWidthOutlined />} onClick={handleEnterResizeMode}>
              {t("notificationsPage.resizeColumns")}
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
          ) : items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("notificationsPage.empty")}
              style={{ padding: "48px 0" }}
            />
          ) : (
            items.map((n, i) => (
              <NotificationRow
                key={n._id}
                notification={n}
                columns={visibleColumns}
                gridTemplateColumns={gridTemplateColumns}
                variant={tableView}
                striped={tableView === "striped" && i % 2 === 1}
                resizable={resizeMode}
                onView={() => handleView(n)}
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

      <NotificationDetailDrawer notification={selected} onClose={() => setSelected(null)} />

      <NotificationViewModal
        open={viewModalOpen}
        value={tableView}
        onSelect={handleSelectTableView}
        onClose={() => setViewModalOpen(false)}
      />

      <ColumnsModal
        open={columnsModalOpen}
        title={t("notificationsPage.columnsModalTitle")}
        hint={t("notificationsPage.columnsModalHint")}
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

function NotificationRow({
  notification,
  columns,
  gridTemplateColumns,
  variant,
  striped,
  resizable,
  onView,
  t,
}: {
  notification: Notification;
  columns: ColumnSetting[];
  gridTemplateColumns: string;
  variant: NotificationViewId;
  striped: boolean;
  resizable: boolean;
  onView: () => void;
  t: TFunction;
}) {
  const { icon, color } = notificationIcon(notification.type);
  const { title, body } = renderNotificationText(notification, t);

  const renderCell = (columnId: ColumnId) => {
    switch (columnId) {
      case "status":
        return (
          <span
            className={`${styles.statusPill} ${notification.isRead ? styles.statusPillRead : styles.statusPillUnread}`}
          >
            <span className={styles.statusDot} />
            {t(notification.isRead ? "notificationsPage.read" : "notificationsPage.unread")}
          </span>
        );
      case "type":
        return (
          <span className={styles.actionBadge} style={{ background: `${color}1a`, color }}>
            {icon}
            <span className={styles.actionBadgeLabel}>
              {t(`notificationsPage.type.${notification.type}`, notification.type)}
            </span>
          </span>
        );
      case "message":
        return (
          <span className={styles.contextCell}>
            <span className={styles.contextPrimary}>{title}</span>
            <span className={styles.contextSecondary}>{body}</span>
          </span>
        );
      case "actor":
        return notification.actorId ? (
          <span className={styles.userCell}>
            <span className={styles.userText}>
              <span className={styles.userName}>{notification.actorId.name}</span>
            </span>
          </span>
        ) : (
          <span className={styles.contextSecondary}>{t("notificationsPage.systemActor")}</span>
        );
      case "date":
        return (
          <span className={styles.dateCell}>
            <span className={styles.dateRelative}>{dayjs(notification.createdAt).fromNow()}</span>
            <span className={styles.dateAbsolute}>{dayjs(notification.createdAt).format("DD MMM YYYY • HH:mm")}</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`${styles[`row_${variant}`] ?? styles.row} ${striped ? styles.rowStriped : ""} ${!notification.isRead ? styles.rowUnread : ""} ${resizable ? styles.rowResizing : ""}`}
      style={{ gridTemplateColumns }}
      onClick={() => !resizable && onView()}
      role="button"
      tabIndex={0}
    >
      {columns.map((c) => (
        <span key={c.id}>{renderCell(c.id)}</span>
      ))}
      <span className={styles.viewCell}>
        <Tooltip title={t("notificationsPage.viewDetails")}>
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
