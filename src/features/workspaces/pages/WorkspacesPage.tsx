import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Tooltip,
  message,
} from "antd";
import {
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useWorkspaces } from "../hooks/useWorkspaces";
import {
  workspaceService,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
} from "../services/workspaceService";
import { Workspace } from "@types/index";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useAppDispatch, useAppSelector } from "@store/index";
import { setActiveWorkspace } from "@store/uiSlice";
import styles from "./WorkspacesPage.module.css";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

export default function WorkspacesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const { data: currentUser } = useCurrentUser();
  const storedWorkspaceId = useAppSelector((s) => s.ui.activeWorkspaceId);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null,
  );
  const [archivingWorkspace, setArchivingWorkspace] = useState<Workspace | null>(
    null,
  );
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  const { data: workspaces, isLoading } = useWorkspaces();

  const {
    mutate: createWorkspace,
    isPending,
    error: createError,
    reset: resetCreateError,
  } = useMutation({
    mutationFn: (dto: CreateWorkspaceDto) => workspaceService.create(dto),
    onSuccess: (workspace) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setModalOpen(false);
      form.resetFields();
      navigate(`/workspaces/${workspace._id}/projects`);
    },
  });

  const createErrorMessage = (() => {
    if (!createError) return null;
    const msg = (createError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("workspaces.createFailed");
  })();

  const closeModal = () => {
    setModalOpen(false);
    resetCreateError();
    form.resetFields();
  };

  const {
    mutate: updateWorkspace,
    isPending: isUpdating,
    error: updateError,
    reset: resetUpdateError,
  } = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkspaceDto }) =>
      workspaceService.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setEditingWorkspace(null);
      message.success(t("workspaces.updated"));
    },
  });

  const updateErrorMessage = (() => {
    if (!updateError) return null;
    const msg = (updateError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("workspaces.updateFailed");
  })();

  const openEditModal = (ws: Workspace) => {
    editForm.setFieldsValue({ name: ws.name, description: ws.description ?? "" });
    setEditingWorkspace(ws);
  };

  const closeEditModal = () => {
    setEditingWorkspace(null);
    resetUpdateError();
    editForm.resetFields();
  };

  const { mutate: archiveWorkspace, isPending: isArchiving } = useMutation({
    mutationFn: (workspaceId: string) => workspaceService.archive(workspaceId),
    onSuccess: (_, workspaceId) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      if (storedWorkspaceId === workspaceId) {
        dispatch(setActiveWorkspace(null));
      }
      setArchivingWorkspace(null);
      message.success(t("workspaces.archived"));
    },
    onError: (error: AxiosError<any>) => {
      const msg = error?.response?.data?.error?.message;
      message.error(
        Array.isArray(msg) ? msg[0] : msg || t("workspaces.archiveFailed"),
      );
    },
  });

  const isOwner = (ws: Workspace) => ws.ownerId === currentUser?._id;

  const { data: archivedWorkspaces, isLoading: isArchivedLoading } = useQuery({
    queryKey: ["workspaces", "archived"],
    queryFn: workspaceService.getArchivedWorkspaces,
    enabled: archivedModalOpen,
  });

  const { mutate: restoreWorkspace, isPending: isRestoring } = useMutation({
    mutationFn: (workspaceId: string) => workspaceService.restore(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["workspaces", "archived"] });
      message.success(t("workspaces.restored"));
    },
    onError: (error: AxiosError<any>) => {
      const msg = error?.response?.data?.error?.message;
      message.error(
        Array.isArray(msg) ? msg[0] : msg || t("workspaces.restoreFailed"),
      );
    },
  });

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("workspaces.title")}</h1>
          <p className={styles.subtitle}>{t("workspaces.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<InboxOutlined />}
            onClick={() => setArchivedModalOpen(true)}
          >
            {t("workspaces.viewArchived")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            {t("workspaces.newWorkspace")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.card}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : workspaces?.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("workspaces.emptyTitle")}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              {t("workspaces.createFirst")}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className={styles.grid}>
          {workspaces?.map((ws) => (
            <div
              key={ws._id}
              className={styles.card}
              onClick={() => navigate(`/workspaces/${ws._id}/projects`)}
            >
              <div className={styles.cardTop}>
                <Avatar size={32} style={{ background: "#4a6cf7" }}>
                  {ws.name?.[0]?.toUpperCase()}
                </Avatar>
                <span className={styles.cardName}>{ws.name}</span>
                <div
                  className={styles.cardActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title={t("workspaces.edit")}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      className={styles.cardActionBtn}
                      onClick={() => openEditModal(ws)}
                    />
                  </Tooltip>
                  {isOwner(ws) && (
                    <Tooltip title={t("workspaces.archive")}>
                      <Button
                        type="text"
                        icon={<InboxOutlined />}
                        className={styles.cardActionBtn}
                        onClick={() => setArchivingWorkspace(ws)}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className={styles.cardDesc}>
                {ws.description || t("workspaces.descriptionPlaceholder")}
              </div>
              <div className={styles.cardFooter}>
                <TeamOutlined />
                {t("workspaces.membersCount", { count: ws.members?.length ?? 0 })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={t("workspaces.createTitle")}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={480}
        destroyOnClose
      >
        {createErrorMessage && (
          <div style={{ color: "#f85149", marginBottom: 12, fontSize: 13 }}>
            {createErrorMessage}
          </div>
        )}
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => createWorkspace(values)}
          onValuesChange={(changed) => {
            if (changed.name && !form.isFieldTouched("slug")) {
              form.setFieldValue("slug", slugify(changed.name));
            }
          }}
        >
          <Form.Item
            name="name"
            label={t("workspaces.nameLabel")}
            rules={[{ required: true, message: t("workspaces.nameRequired") }]}
          >
            <Input placeholder={t("workspaces.namePlaceholder")} autoFocus />
          </Form.Item>
          <Form.Item
            name="slug"
            label={t("workspaces.slugLabel")}
            extra={t("workspaces.slugExtra")}
            rules={[
              { required: true, message: t("workspaces.slugRequired") },
              {
                pattern: /^[a-z0-9-]+$/,
                message: t("workspaces.slugInvalid"),
              },
            ]}
          >
            <Input
              placeholder="acme-corp"
              onChange={(e) =>
                form.setFieldValue("slug", slugify(e.target.value))
              }
            />
          </Form.Item>
          <Form.Item name="description" label={t("workspaces.descriptionLabel")}>
            <Input.TextArea
              rows={3}
              placeholder={t("workspaces.descriptionPlaceholder")}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={closeModal}>{t("workspaces.cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={isPending}>
                {t("workspaces.create")}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("workspaces.editTitle")}
        open={!!editingWorkspace}
        onCancel={closeEditModal}
        footer={null}
        width={480}
        destroyOnClose
      >
        {updateErrorMessage && (
          <div style={{ color: "#f85149", marginBottom: 12, fontSize: 13 }}>
            {updateErrorMessage}
          </div>
        )}
        <Form
          form={editForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) =>
            editingWorkspace &&
            updateWorkspace({ id: editingWorkspace._id, dto: values })
          }
        >
          <Form.Item
            name="name"
            label={t("workspaces.nameLabel")}
            rules={[{ required: true, message: t("workspaces.nameRequired") }]}
          >
            <Input placeholder={t("workspaces.namePlaceholder")} autoFocus />
          </Form.Item>
          <Form.Item name="description" label={t("workspaces.descriptionLabel")}>
            <Input.TextArea
              rows={3}
              placeholder={t("workspaces.descriptionPlaceholder")}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={closeEditModal}>{t("workspaces.cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={isUpdating}>
                {t("workspaces.save")}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("workspaces.archiveConfirmTitle")}
        open={!!archivingWorkspace}
        onCancel={() => setArchivingWorkspace(null)}
        centered
        width={560}
        okText={t("workspaces.archiveConfirmOk")}
        cancelText={t("workspaces.cancel")}
        okButtonProps={{ danger: true, loading: isArchiving }}
        onOk={() =>
          archivingWorkspace && archiveWorkspace(archivingWorkspace._id)
        }
      >
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          {t("workspaces.archiveConfirmDesc", {
            name: archivingWorkspace?.name,
            archivedLabel: t("workspaces.viewArchived"),
          })}
        </p>
      </Modal>

      <Modal
        title={t("workspaces.archivedTitle")}
        open={archivedModalOpen}
        onCancel={() => setArchivedModalOpen(false)}
        footer={null}
        centered
        width={560}
      >
        <p style={{ color: "#8c8c8c", fontSize: 13, marginTop: -8 }}>
          {t("workspaces.archivedSubtitle")}
        </p>
        {isArchivedLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : archivedWorkspaces?.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("workspaces.archivedEmpty")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {archivedWorkspaces?.map((ws) => (
              <div
                key={ws._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                }}
              >
                <Avatar size={32} style={{ background: "#8c8c8c" }}>
                  {ws.name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#1a1f2e" }}>
                    {ws.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#8c8c8c",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ws.description || "—"}
                  </div>
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  loading={isRestoring}
                  onClick={() => restoreWorkspace(ws._id)}
                >
                  {t("workspaces.restore")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
