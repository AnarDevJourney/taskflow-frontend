import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Skeleton,
  Empty,
  Tooltip,
  message,
} from "antd";
import {
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ProjectOutlined,
  ReloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useProjects } from "../hooks/useProjects";
import {
  projectService,
  CreateProjectDto,
  UpdateProjectDto,
} from "../services/projectService";
import { Project } from "@types/index";
import styles from "./ProjectsPage.module.css";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(
    null,
  );
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);

  const { data: projects, isLoading } = useProjects(workspaceId ?? "");

  const { mutate: createProject, isPending } = useMutation({
    mutationFn: (dto: CreateProjectDto) =>
      projectService.create(workspaceId ?? "", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      setModalOpen(false);
      form.resetFields();
    },
  });

  const {
    mutate: updateProject,
    isPending: isUpdating,
    error: updateError,
    reset: resetUpdateError,
  } = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProjectDto }) =>
      projectService.update(workspaceId ?? "", id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      setEditingProject(null);
      message.success(t("projects.updated"));
    },
  });

  const updateErrorMessage = (() => {
    if (!updateError) return null;
    const msg = (updateError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("projects.updateFailed");
  })();

  const openEditModal = (project: Project) => {
    editForm.setFieldsValue({
      name: project.name,
      description: project.description ?? "",
    });
    setEditingProject(project);
  };

  const closeEditModal = () => {
    setEditingProject(null);
    resetUpdateError();
    editForm.resetFields();
  };

  const { mutate: archiveProject, isPending: isArchiving } = useMutation({
    mutationFn: (id: string) => projectService.archive(workspaceId ?? "", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      setArchivingProject(null);
      message.success(t("projects.archived"));
    },
    onError: () => message.error(t("projects.archiveFailed")),
  });

  const { data: archivedProjects, isLoading: isArchivedLoading } = useQuery({
    queryKey: ["projects", workspaceId, "archived"],
    queryFn: () => projectService.getArchivedProjects(workspaceId ?? ""),
    enabled: archivedModalOpen && !!workspaceId,
  });

  const { mutate: restoreProject, isPending: isRestoring } = useMutation({
    mutationFn: (id: string) => projectService.restore(workspaceId ?? "", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      qc.invalidateQueries({ queryKey: ["projects", workspaceId, "archived"] });
      message.success(t("projects.restored"));
    },
    onError: () => message.error(t("projects.restoreFailed")),
  });

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("projects.title")}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<InboxOutlined />}
            onClick={() => setArchivedModalOpen(true)}
          >
            {t("projects.viewArchived")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            {t("projects.newProject")}
          </Button>
        </div>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 8,
                padding: 20,
              }}
            >
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("projects.emptyTitle")}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              {t("projects.createFirst")}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects?.map((project) => (
            <Link
              key={project._id}
              to={`/workspaces/${workspaceId}/projects/${project._id}/board`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div
                  className={styles.colorDot}
                  style={{ background: project.color || "#4a6cf7" }}
                />
                <span className={styles.cardKey}>{project.key}</span>
                {project.sprintMode && (
                  <span className={styles.sprintBadge}>
                    {t("projects.sprintMode")}
                  </span>
                )}
                <div
                  className={styles.cardActions}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Tooltip title={t("projects.edit")}>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      className={styles.cardActionBtn}
                      onClick={() => openEditModal(project)}
                    />
                  </Tooltip>
                  <Tooltip title={t("projects.archive")}>
                    <Button
                      type="text"
                      icon={<InboxOutlined />}
                      className={styles.cardActionBtn}
                      onClick={() => setArchivingProject(project)}
                    />
                  </Tooltip>
                </div>
              </div>

              <div className={styles.cardName}>{project.name}</div>
              <div className={styles.cardDesc}>
                {project.description || t("projects.noDescription")}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.cardMeta}>
                  <Tooltip title={t("projects.tasksTooltip")}>
                    <span className={styles.metaItem}>
                      <ProjectOutlined />
                      {project.taskCounter}
                    </span>
                  </Tooltip>
                  <Tooltip title={t("projects.membersTooltip")}>
                    <span className={styles.metaItem}>
                      <TeamOutlined />
                      {project.members?.length ?? 0}
                    </span>
                  </Tooltip>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal
        title={t("projects.createTitle")}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={480}
      >
        <div className={styles.modal}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => createProject(values)}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="name"
              label={t("projects.nameLabel")}
              rules={[
                { required: true, message: t("projects.nameRequired") },
              ]}
            >
              <Input placeholder={t("projects.namePlaceholder")} />
            </Form.Item>

            <Form.Item
              name="key"
              label={t("projects.keyLabel")}
              rules={[
                { required: true, message: t("projects.keyRequired") },
                { max: 6, message: t("projects.keyMaxLength") },
                {
                  pattern: /^[A-Z0-9]+$/,
                  message: t("projects.keyPattern"),
                },
              ]}
              extra={t("projects.keyExtra")}
            >
              <Input
                placeholder={t("projects.keyPlaceholder")}
                style={{ textTransform: "uppercase" }}
                onChange={(e) =>
                  form.setFieldValue("key", e.target.value.toUpperCase())
                }
              />
            </Form.Item>

            <Form.Item name="description" label={t("projects.descriptionLabel")}>
              <Input.TextArea
                placeholder={t("projects.descriptionPlaceholder")}
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <Button
                  onClick={() => {
                    setModalOpen(false);
                    form.resetFields();
                  }}
                >
                  {t("projects.cancel")}
                </Button>
                <Button type="primary" htmlType="submit" loading={isPending}>
                  {t("projects.create")}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Edit project modal */}
      <Modal
        title={t("projects.editTitle")}
        open={!!editingProject}
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
            editingProject &&
            updateProject({ id: editingProject._id, dto: values })
          }
        >
          <Form.Item
            name="name"
            label={t("projects.nameLabel")}
            rules={[{ required: true, message: t("projects.nameRequired") }]}
          >
            <Input placeholder={t("projects.namePlaceholder")} autoFocus />
          </Form.Item>
          <Form.Item name="description" label={t("projects.descriptionLabel")}>
            <Input.TextArea
              rows={3}
              placeholder={t("projects.descriptionPlaceholder")}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={closeEditModal}>{t("projects.cancel")}</Button>
              <Button type="primary" htmlType="submit" loading={isUpdating}>
                {t("projects.save")}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Archive confirmation modal */}
      <Modal
        title={t("projects.archiveConfirmTitle")}
        open={!!archivingProject}
        onCancel={() => setArchivingProject(null)}
        centered
        width={560}
        okText={t("projects.archiveConfirmOk")}
        cancelText={t("projects.cancel")}
        okButtonProps={{ danger: true, loading: isArchiving }}
        onOk={() =>
          archivingProject && archiveProject(archivingProject._id)
        }
      >
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          {t("projects.archiveConfirmDesc", {
            name: archivingProject?.name,
            archivedLabel: t("projects.viewArchived"),
          })}
        </p>
      </Modal>

      {/* Archived projects modal */}
      <Modal
        title={t("projects.archivedTitle")}
        open={archivedModalOpen}
        onCancel={() => setArchivedModalOpen(false)}
        footer={null}
        centered
        width={560}
      >
        <p style={{ color: "#8c8c8c", fontSize: 13, marginTop: -8 }}>
          {t("projects.archivedSubtitle")}
        </p>
        {isArchivedLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : archivedProjects?.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("projects.archivedEmpty")}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {archivedProjects?.map((project) => (
              <div
                key={project._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                }}
              >
                <Avatar
                  size={32}
                  shape="square"
                  style={{ background: project.color || "#8c8c8c" }}
                >
                  {project.key?.[0]}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#1a1f2e" }}>
                    {project.name}
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
                    {project.description || "—"}
                  </div>
                </div>
                <Button
                  icon={<ReloadOutlined />}
                  loading={isRestoring}
                  onClick={() => restoreProject(project._id)}
                >
                  {t("projects.restore")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
