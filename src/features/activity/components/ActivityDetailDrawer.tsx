import { Avatar, Collapse, Drawer, Tag } from "antd";
import { RightOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { ActivityLog, WorkspaceMember } from "@types/index";
import {
  ACTION_CATEGORY_COLORS,
  ACTION_CATEGORY_ICONS,
  getActionCategory,
} from "../utils/activityMeta";
import styles from "./ActivityDetailDrawer.module.css";

interface ActivityDetailDrawerProps {
  log: ActivityLog | null;
  members?: WorkspaceMember[];
  onClose: () => void;
}

// fields that render as a from → to diff card; everything else falls back
// to a plain "value" block
const FIELD_LABEL_KEYS: Record<string, string> = {
  status: "activityLogPage.field.status",
  priority: "activityLogPage.field.priority",
  assigneeId: "activityLogPage.field.assignee",
  dueDate: "activityLogPage.field.dueDate",
  title: "activityLogPage.field.title",
  description: "activityLogPage.field.description",
  labels: "activityLogPage.field.labels",
  storyPoints: "activityLogPage.field.storyPoints",
  sprintId: "activityLogPage.field.sprint",
  body: "activityLogPage.field.commentBody",
};

// fields whose raw stored value is a fixed enum with its own translation
// table elsewhere in the app — reuse those keys instead of showing the
// raw English enum value (e.g. "medium" instead of "Orta"/"Средний")
const ENUM_VALUE_LABEL_PREFIX: Record<string, string> = {
  priority: "taskDetailModal.priorityLabels",
};

function formatValue(
  value: unknown,
  field: string | null,
  t: TFunction,
  members: WorkspaceMember[] | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const raw = String(value);

  // assigneeId is stored as a raw user id — resolve it to a name via the
  // workspace members list rather than showing the id itself
  if (field === "assigneeId") {
    return members?.find((m) => m.userId._id === raw)?.userId.name ?? raw;
  }

  // dueDate is stored as a raw ISO 8601 string — show it the same way the
  // rest of the app formats dates rather than the raw "2026-08-18T20:00:00.000Z"
  if (field === "dueDate") {
    return dayjs(raw).format("DD MMM YYYY");
  }

  const prefix = field ? ENUM_VALUE_LABEL_PREFIX[field] : undefined;
  return prefix ? t(`${prefix}.${raw}`, raw) : raw;
}

// short, readable id derived from the real Mongo _id — not a fabricated
// sequence, just a friendlier display of the last 6 hex chars
function formatLogId(id: string): string {
  return `LOG-${id.slice(-6).toUpperCase()}`;
}

export default function ActivityDetailDrawer({
  log,
  members,
  onClose,
}: ActivityDetailDrawerProps) {
  const { t } = useTranslation();
  if (!log) return <Drawer open={false} onClose={onClose} />;

  const category = getActionCategory(log.action);
  const color = ACTION_CATEGORY_COLORS[category];
  const Icon = ACTION_CATEGORY_ICONS[category];

  const task = typeof log.taskId === "object" ? log.taskId : null;
  const project = typeof log.projectId === "object" ? log.projectId : null;
  const role = members?.find((m) => m.userId._id === log.actorId?._id)?.role;

  const hasFieldChange = log.field !== null;
  const isCreate = category === "create" && !hasFieldChange;
  const isDelete = category === "delete" && !hasFieldChange;

  return (
    <Drawer
      open={!!log}
      onClose={onClose}
      title={null}
      width={480}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.header}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="close"
        >
          ✕
        </button>
        <h2 className={styles.title}>{t("activityLogPage.detailTitle")}</h2>
        <div className={styles.logId}>{formatLogId(log._id)}</div>
      </div>

      <div className={styles.section}>
        <div
          className={styles.summaryBadge}
          style={{ background: `${color}1a`, color }}
        >
          <Icon />
          <span>{t(`activityLogPage.action.${log.action}`, log.action)}</span>
        </div>
        <div className={styles.timestamp}>
          {dayjs(log.createdAt).format("DD MMMM YYYY, HH:mm")}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          {t("activityLogPage.detailUser")}
        </div>
        <div className={styles.actorRow}>
          <Avatar
            size={48}
            src={log.actorId?.avatarUrl ?? undefined}
            style={{ background: "#4a6cf7", fontSize: 18 }}
          >
            {log.actorId?.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div className={styles.actorName}>{log.actorId?.name}</div>
            {role && (
              <div className={styles.actorRole}>
                {t(`members.role.${role}`)}
              </div>
            )}
            <div className={styles.actorEmail}>{log.actorId?.email}</div>
          </div>
        </div>
      </div>

      {(task || project) && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {t("activityLogPage.detailContext")}
          </div>
          <div className={styles.contextCard}>
            {project && (
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>
                  {t("activityLogPage.detailProject")}
                </span>
                <span className={styles.contextValue}>{project.name}</span>
              </div>
            )}
            {task && (
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>
                  {t("activityLogPage.detailTask")}
                </span>
                <span className={styles.contextValue}>{task.title}</span>
              </div>
            )}
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>
                {t("activityLogPage.column.module")}
              </span>
              <span className={styles.contextValue}>
                {t(`activityLogPage.module.${log.module}`, "")}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          {t("activityLogPage.detailChangedFields")}
        </div>
        {hasFieldChange ? (
          <div className={styles.diffCard}>
            <div className={styles.diffCardTitle}>
              {t(FIELD_LABEL_KEYS[log.field ?? ""] ?? "", log.field ?? "")}
            </div>
            <div className={styles.diffCardRow}>
              <Tag className={styles.oldTag}>
                {formatValue(log.oldValue, log.field, t, members)}
              </Tag>
              <RightOutlined className={styles.diffArrow} />
              <Tag className={styles.newTag}>
                {formatValue(log.newValue, log.field, t, members)}
              </Tag>
            </div>
          </div>
        ) : isCreate ? (
          <div className={styles.noChange}>
            {t("activityLogPage.detailCreatedNote")}
          </div>
        ) : isDelete ? (
          <div className={styles.noChange}>
            {t("activityLogPage.detailDeletedNote")}
          </div>
        ) : (
          <div className={styles.noChange}>
            {t("activityLogPage.detailNoFieldChange")}
          </div>
        )}
      </div>

      {log.meta && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {t("activityLogPage.detailMeta")}
          </div>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>
              {t("activityLogPage.detailMetaLabel")}
            </div>
            <div className={styles.metaText}>{log.meta}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <Collapse
          ghost
          className={styles.systemCollapse}
          items={[
            {
              key: "system",
              label: (
                <span className={styles.sectionTitle}>
                  {t("activityLogPage.detailSystemInfo")}
                </span>
              ),
              children: (
                <div className={styles.systemGrid}>
                  <div className={styles.systemItem}>
                    <span className={styles.contextLabel}>IP</span>
                    <span className={styles.contextValue}>
                      {log.ip ?? t("activityLogPage.detailNotAvailable")}
                    </span>
                  </div>
                  <div className={styles.systemItem}>
                    <span className={styles.contextLabel}>Browser</span>
                    <span className={styles.contextValue}>
                      {log.browser ?? t("activityLogPage.detailNotAvailable")}
                    </span>
                  </div>
                  <div className={styles.systemItem}>
                    <span className={styles.contextLabel}>OS</span>
                    <span className={styles.contextValue}>
                      {log.os ?? t("activityLogPage.detailNotAvailable")}
                    </span>
                  </div>
                  <div className={styles.systemItem}>
                    <span className={styles.contextLabel}>Device</span>
                    <span className={styles.contextValue}>
                      {log.device ?? t("activityLogPage.detailNotAvailable")}
                    </span>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
}
