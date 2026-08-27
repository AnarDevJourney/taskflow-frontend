import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { toast } from "@lib/toast";
import {
  ClearOutlined,
  CloseOutlined,
  ColumnWidthOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  SettingOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { Resizable, ResizeCallbackData } from "react-resizable";
import { workspaceService, InviteMemberDto } from "../services/workspaceService";
import { WorkspaceMember, WorkspaceRole } from "@types/index";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useSaveTableSettings, useTableSettings } from "@features/tableSettings/hooks/useTableSettings";
import SimplePagination from "@components/ui/SimplePagination";
import ColumnsModal from "@components/ui/ColumnsModal";
import MembersViewModal from "../components/MembersViewModal";
import {
  ColumnId,
  ColumnSetting,
  DEFAULT_COLUMNS,
  DEFAULT_COLUMN_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  COLUMN_LABEL_KEYS,
  columnWidthCss,
  normalizeColumns,
} from "../utils/membersColumns";
import { MembersViewId, DEFAULT_MEMBERS_VIEW } from "../utils/membersViews";
import styles from "./WorkspaceMembersPage.module.css";

const { Text, Paragraph } = Typography;

// page size, table view, and columns (visibility, order, width) all live in
// the same `table-settings` collection My Tasks / Activity Log use — just a
// different `key`, one document per user per table (see backend's Table
// Settings Module Notes)
const TABLE_SETTINGS_KEY = "members";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  [WorkspaceRole.OWNER]: "#b54708",
  [WorkspaceRole.ADMIN]: "#6941c6",
  [WorkspaceRole.MEMBER]: "#0e7490",
  [WorkspaceRole.VIEWER]: "#3b7c0f",
  [WorkspaceRole.GUEST]: "#667085",
};

export default function WorkspaceMembersPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [form] = Form.useForm();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const ROLE_OPTIONS = [
    { value: WorkspaceRole.ADMIN, label: t("members.role.admin") },
    { value: WorkspaceRole.MEMBER, label: t("members.role.member") },
    { value: WorkspaceRole.VIEWER, label: t("members.role.viewer") },
  ];

  const ROLE_FILTER_OPTIONS = [
    { value: WorkspaceRole.OWNER, label: t("members.role.owner") },
    { value: WorkspaceRole.ADMIN, label: t("members.role.admin") },
    { value: WorkspaceRole.MEMBER, label: t("members.role.member") },
    { value: WorkspaceRole.VIEWER, label: t("members.role.viewer") },
    { value: WorkspaceRole.GUEST, label: t("members.role.guest") },
  ];

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // ─── filters + pagination ────────────────────────────────────────
  // one filter for now, as requested — by role
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ─── table view / columns customization ───────────────────────────
  const [tableView, setTableView] = useState<MembersViewId>(DEFAULT_MEMBERS_VIEW);
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
  // pattern as MyTasksPage/ActivityLogPage, so the initial defaults don't
  // get saved over the user's real settings before they load
  useEffect(() => {
    if (!settingsFetched || appliedSavedSettings.current) return;
    appliedSavedSettings.current = true;

    if (savedSettings?.tableView) setTableView(savedSettings.tableView as MembersViewId);
    if (savedSettings?.columns) setColumns(normalizeColumns(savedSettings.columns));
    if (savedSettings?.pageSize) setPageSize(savedSettings.pageSize);
  }, [settingsFetched, savedSettings]);

  // pageSize is a plain toolbar control (not modal-driven), so it saves
  // straight away, same as MyTasksPage/ActivityLogPage
  useEffect(() => {
    if (!appliedSavedSettings.current) return;
    saveSettings({ pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const handleSelectTableView = (view: MembersViewId) => {
    setTableView(view);
    saveSettings({ tableView: view });
  };

  // the columns modal stays open across many toggles/drags; only persist
  // once, with whatever the final arrangement is, when it's closed
  const handleCloseColumnsModal = () => {
    setColumnsModalOpen(false);
    saveSettings({ columns });
  };

  // ─── Column resize mode ──────────────────────────────────────────
  // same "measure the real rendered width first" approach as My Tasks /
  // Activity Log — see MyTasksPage's handleEnterResizeMode for the rationale
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
  }, [roleFilter, pageSize]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId ?? ""),
    enabled: !!workspaceId,
  });

  const {
    mutate: invite,
    isPending: isInviting,
    error: inviteError,
    reset: resetInviteError,
  } = useMutation({
    mutationFn: (dto: InviteMemberDto) => workspaceService.inviteMember(workspaceId ?? "", dto),
    onSuccess: ({ token }) => {
      setInviteLink(`${window.location.origin}/register?token=${token}`);
      form.resetFields();
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) => workspaceService.removeMember(workspaceId ?? "", memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      toast.success(t("members.memberRemoved"));
    },
    onError: () => toast.error(t("members.removeMemberFailed")),
  });

  const { mutate: updateRole, isPending: isUpdatingRole } = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(workspaceId ?? "", memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      toast.success(t("members.roleUpdated"));
    },
    onError: (error: AxiosError<any>) => {
      const msg = error?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || t("members.roleUpdateFailed"));
    },
  });

  const inviteErrorMessage = (() => {
    if (!inviteError) return null;
    const msg = (inviteError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("members.sendInviteFailed");
  })();

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteLink(null);
    resetInviteError();
    form.resetFields();
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success(t("members.inviteLinkCopied"));
  };

  const myRole = members?.find((m) => m.userId?._id === currentUser?._id)?.role;
  const canManageMembers = myRole === WorkspaceRole.OWNER || myRole === WorkspaceRole.ADMIN;

  // the endpoint returns the whole workspace's member list unpaginated
  // (bounded in practice — a workspace's membership isn't a growth-unbounded
  // collection like tasks/notifications/activity), so filtering + pagination
  // happen client-side here rather than adding server-side query params
  const allMembers = useMemo(() => members?.filter((m) => m.userId) ?? [], [members]);
  const filteredMembers = useMemo(
    () => (roleFilter ? allMembers.filter((m) => m.role === roleFilter) : allMembers),
    [allMembers, roleFilter],
  );

  const total = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // clamp page down if a filter change shrinks the result set out from under it
  const safePage = Math.min(page, totalPages);
  const pagedMembers = filteredMembers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = !!roleFilter;
  const clearFilters = () => setRoleFilter(null);

  const visibleColumns = (resizeMode ? draftColumns : columns).filter((c) => c.visible);
  const gridTemplateColumns = `${visibleColumns.map((c) => columnWidthCss(c)).join(" ")} 64px`;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("members.title")}</h1>
          <p className={styles.pageSubtitle}>{t("members.subtitle")}</p>
        </div>
        <div className={styles.headerActions}>
          {allMembers.length > 0 && (
            <span className={styles.totalBadge}>{t("members.totalCount", { count: total })}</span>
          )}
          {canManageMembers && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteModalOpen(true)}>
              {t("members.inviteMember")}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterField}>
          <span className={styles.filterLabel}>{t("members.filterRole")}</span>
          <Select
            allowClear
            placeholder={t("members.allRoles")}
            className={styles.filterControl}
            value={roleFilter}
            onChange={(v) => setRoleFilter(v ?? null)}
            options={ROLE_FILTER_OPTIONS}
          />
        </div>

        {hasFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters} className={styles.clearBtn}>
            {t("members.clearFilters")}
          </Button>
        )}

        <div className={styles.toolbarRight}>
          <div className={styles.pageSizeField}>
            <span className={styles.filterLabel}>{t("members.perPage")}</span>
            <Select value={pageSize} style={{ width: 90 }} onChange={setPageSize}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Select.Option key={size} value={size}>
                  {size}
                </Select.Option>
              ))}
            </Select>
          </div>

          <Button icon={<TableOutlined />} onClick={() => setViewModalOpen(true)}>
            {t("members.customizeTable")}
          </Button>

          <Button icon={<SettingOutlined />} onClick={() => setColumnsModalOpen(true)}>
            {t("members.customizeColumns")}
          </Button>

          {resizeMode ? (
            <>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveResize}>
                {t("members.saveWidths")}
              </Button>
              <Button icon={<CloseOutlined />} onClick={handleCancelResize}>
                {t("members.cancelResize")}
              </Button>
            </>
          ) : (
            <Button icon={<ColumnWidthOutlined />} onClick={handleEnterResizeMode}>
              {t("members.resizeColumns")}
            </Button>
          )}
        </div>
      </div>

      <div ref={tableContainerRef} className={styles.tableScroll}>
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
          ) : pagedMembers.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("members.empty")}
              style={{ padding: "48px 0" }}
            />
          ) : (
            pagedMembers.map((member, i) => (
              <MemberRow
                key={member.userId._id}
                member={member}
                columns={visibleColumns}
                gridTemplateColumns={gridTemplateColumns}
                variant={tableView}
                striped={tableView === "striped" && i % 2 === 1}
                resizable={resizeMode}
                canManageMembers={canManageMembers}
                isSelf={member.userId._id === currentUser?._id}
                roleOptions={ROLE_OPTIONS}
                isUpdatingRole={isUpdatingRole}
                onRoleChange={(role) => updateRole({ memberId: member.userId._id, role })}
                onRemove={() => removeMember(member.userId._id)}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {total > 0 && (
        <div className={styles.pagination}>
          <SimplePagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <MembersViewModal
        open={viewModalOpen}
        value={tableView}
        onSelect={handleSelectTableView}
        onClose={() => setViewModalOpen(false)}
      />

      <ColumnsModal
        open={columnsModalOpen}
        title={t("members.columnsModalTitle")}
        hint={t("members.columnsModalHint")}
        columns={columns}
        labels={Object.fromEntries(
          (Object.keys(COLUMN_LABEL_KEYS) as ColumnId[]).map((id) => [id, t(COLUMN_LABEL_KEYS[id])]),
        )}
        onChange={setColumns}
        onClose={handleCloseColumnsModal}
      />

      <Modal
        title={inviteLink ? t("members.inviteSentTitle") : t("members.inviteMemberTitle")}
        open={inviteModalOpen}
        onCancel={closeInviteModal}
        footer={null}
        width={480}
      >
        {inviteLink ? (
          <div>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {t("members.inviteSentBody")}
            </Paragraph>
            <div className={styles.linkRow}>
              <Text code className={styles.linkText}>
                {inviteLink}
              </Text>
              <Button icon={<CopyOutlined />} onClick={copyInviteLink} />
            </div>
            <Button type="primary" block style={{ marginTop: 16 }} onClick={closeInviteModal}>
              {t("members.done")}
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => invite(values)}>
            {inviteErrorMessage && <div className={styles.inviteError}>{inviteErrorMessage}</div>}
            <Form.Item
              name="email"
              label={t("members.emailLabel")}
              rules={[
                { required: true, message: t("members.emailRequired") },
                { type: "email", message: t("members.emailInvalid") },
              ]}
            >
              <Input placeholder={t("members.emailPlaceholder")} autoFocus />
            </Form.Item>
            <Form.Item
              name="role"
              label={t("members.roleLabel")}
              initialValue={WorkspaceRole.MEMBER}
              rules={[{ required: true, message: t("members.roleRequired") }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" loading={isInviting} block>
                {t("members.sendInvite")}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

function MemberRow({
  member,
  columns,
  gridTemplateColumns,
  variant,
  striped,
  resizable,
  canManageMembers,
  isSelf,
  roleOptions,
  isUpdatingRole,
  onRoleChange,
  onRemove,
  t,
}: {
  member: WorkspaceMember;
  columns: ColumnSetting[];
  gridTemplateColumns: string;
  variant: MembersViewId;
  striped: boolean;
  resizable: boolean;
  canManageMembers: boolean;
  isSelf: boolean;
  roleOptions: { value: WorkspaceRole; label: string }[];
  isUpdatingRole: boolean;
  onRoleChange: (role: WorkspaceRole) => void;
  onRemove: () => void;
  t: TFunction;
}) {
  const canEditRole = canManageMembers && member.role !== WorkspaceRole.OWNER && !isSelf;
  const canRemove = canManageMembers && member.role !== WorkspaceRole.OWNER;

  const renderCell = (columnId: ColumnId) => {
    switch (columnId) {
      case "name":
        return (
          <span className={styles.nameCell}>
            <Avatar
              size={32}
              src={member.userId.avatarUrl ?? undefined}
              style={{ background: "#4a6cf7", fontSize: 13, flexShrink: 0 }}
            >
              {member.userId.name?.[0]?.toUpperCase()}
            </Avatar>
            <span className={styles.nameText}>{member.userId.name}</span>
          </span>
        );
      case "email":
        return <span className={styles.emailCell}>{member.userId.email}</span>;
      case "role":
        return canEditRole ? (
          <Select
            size="small"
            value={member.role}
            options={roleOptions}
            loading={isUpdatingRole}
            style={{ width: 110 }}
            onClick={(e) => e.stopPropagation()}
            onChange={onRoleChange}
          />
        ) : (
          <Tag className={styles.roleTag}>{t(`members.role.${member.role}`)}</Tag>
        );
      case "joinedAt":
        return <span className={styles.dateCell}>{dayjs(member.joinedAt).format("DD MMM YYYY")}</span>;
    }
  };

  const colorfulStyle =
    variant === "colorful" ? { borderLeft: `3px solid ${ROLE_COLORS[member.role]}` } : undefined;

  return (
    <div
      className={`${styles[`row_${variant}`] ?? styles.row} ${striped ? styles.rowStriped : ""}`}
      style={{ gridTemplateColumns, ...colorfulStyle }}
    >
      {columns.map((c) => (
        <span key={c.id}>{renderCell(c.id)}</span>
      ))}
      <span className={styles.removeCell}>
        {canRemove && (
          <Tooltip title={t("members.removeMember")}>
            <Button
              danger
              icon={<DeleteOutlined />}
              type="text"
              shape="circle"
              className={styles.removeBtn}
              disabled={resizable}
              onClick={onRemove}
            />
          </Tooltip>
        )}
      </span>
    </div>
  );
}
