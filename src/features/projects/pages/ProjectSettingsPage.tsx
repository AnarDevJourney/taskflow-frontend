import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Switch,
  Tag,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProject } from "../hooks/useProjects";
import {
  projectService,
  UpdateProjectDto,
  UpdateStatusConfigItem,
} from "../services/projectService";
import { workspaceService } from "@features/workspaces/services/workspaceService";
import { ProjectMember, StatusConfig } from "@types/index";
import styles from "./ProjectSettingsPage.module.css";

const DEFAULT_STATUS_COLOR = "#4a6cf7";

interface ColumnRow extends StatusConfig {
  id: string;
}

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

interface SortableColumnRowProps {
  row: ColumnRow;
  disableRemove: boolean;
  onChange: (
    id: string,
    field: "name" | "wipLimit" | "color",
    value: string | number | null,
  ) => void;
  onRemove: (id: string) => void;
}

function SortableColumnRow({
  row,
  disableRemove,
  onChange,
  onRemove,
}: SortableColumnRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.columnRow}>
      <span
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
      >
        <HolderOutlined />
      </span>
      <ColorPicker
        value={row.color}
        onChange={(color) => onChange(row.id, "color", `#${color.toHex()}`)}
        disabledAlpha
      />
      <Input
        value={row.name}
        onChange={(e) => onChange(row.id, "name", e.target.value)}
        className={styles.columnNameInput}
      />
      <InputNumber
        value={row.wipLimit ?? undefined}
        onChange={(value) => onChange(row.id, "wipLimit", value ?? null)}
        placeholder={t("projectSettings.wipLimitPlaceholder")}
        min={1}
        className={styles.wipInput}
      />
      <Button
        danger
        type="text"
        icon={<DeleteOutlined />}
        disabled={disableRemove}
        onClick={() => onRemove(row.id)}
      />
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const { data: project, isLoading } = useProject(
    workspaceId ?? "",
    projectId ?? "",
  );

  const [statuses, setStatuses] = useState<ColumnRow[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (project) {
      form.setFieldsValue({
        name: project.name,
        description: project.description,
        sprintMode: project.sprintMode,
      });
      setStatuses(
        [...project.statuses]
          .sort((a, b) => a.order - b.order)
          .map((s) => ({ ...s, id: makeId() })),
      );
    }
  }, [project, form]);

  // ─── General ────────────────────────────────────────────────────
  const { mutate: updateProject, isPending: isSavingGeneral } = useMutation({
    mutationFn: (dto: UpdateProjectDto) =>
      projectService.update(workspaceId ?? "", projectId ?? "", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      message.success(t("projectSettings.updated"));
    },
    onError: () => message.error(t("projectSettings.updateFailed")),
  });

  // ─── Statuses ───────────────────────────────────────────────────
  const { mutate: saveStatuses, isPending: isSavingStatuses } = useMutation({
    mutationFn: (items: UpdateStatusConfigItem[]) =>
      projectService.updateStatuses(
        workspaceId ?? "",
        projectId ?? "",
        items,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      message.success(t("projectSettings.columnsUpdated"));
    },
    onError: () => message.error(t("projectSettings.columnsUpdateFailed")),
  });

  const handleAddColumn = () => {
    setStatuses((prev) => [
      ...prev,
      {
        id: makeId(),
        name: t("projectSettings.newColumnName"),
        color: DEFAULT_STATUS_COLOR,
        order: prev.length,
        wipLimit: null,
      },
    ]);
  };

  const handleRemoveColumn = (id: string) => {
    if (statuses.length <= 1) return;
    setStatuses((prev) => prev.filter((s) => s.id !== id));
  };

  const handleColumnChange = (
    id: string,
    field: "name" | "wipLimit" | "color",
    value: string | number | null,
  ) => {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStatuses((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSaveStatuses = () => {
    saveStatuses(
      statuses.map((s, index) => ({
        name: s.name,
        color: s.color,
        order: index,
        // backend requires a numeric wipLimit (no null) — treat empty as "unlimited"
        wipLimit: s.wipLimit ?? 999,
      })),
    );
  };

  // ─── Members ────────────────────────────────────────────────────
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => projectService.getMembers(workspaceId ?? "", projectId ?? ""),
    enabled: !!workspaceId && !!projectId,
  });

  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(
    null,
  );

  const { mutate: removeMember, isPending: isRemovingMember } = useMutation({
    mutationFn: (memberId: string) =>
      projectService.removeMember(
        workspaceId ?? "",
        projectId ?? "",
        memberId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      message.success(t("projectSettings.memberRemoved"));
      setRemovingMember(null);
    },
    onError: () => message.error(t("projectSettings.memberRemoveFailed")),
  });

  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [addMemberForm] = Form.useForm();

  const { data: workspaceMembers } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId ?? ""),
    enabled: addMemberModalOpen && !!workspaceId,
  });

  const availableMembers = (workspaceMembers ?? []).filter(
    (wm) => !members?.some((pm) => pm.userId._id === wm.userId._id),
  );

  const closeAddMemberModal = () => {
    setAddMemberModalOpen(false);
    addMemberForm.resetFields();
  };

  const { mutate: addMember, isPending: isAddingMember } = useMutation({
    mutationFn: (memberId: string) =>
      projectService.addMember(workspaceId ?? "", projectId ?? "", memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      message.success(t("projectSettings.memberAdded"));
      closeAddMemberModal();
    },
    onError: () => message.error(t("projectSettings.memberAddFailed")),
  });

  // ─── Danger zone ────────────────────────────────────────────────
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);

  const { mutate: archiveProject, isPending: isArchiving } = useMutation({
    mutationFn: () =>
      projectService.archive(workspaceId ?? "", projectId ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      message.success(t("projectSettings.archived"));
      navigate(`/workspaces/${workspaceId}/projects`);
    },
    onError: () => message.error(t("projectSettings.archiveFailed")),
  });

  if (isLoading || !project) {
    return (
      <div className={styles.page}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() =>
          navigate(`/workspaces/${workspaceId}/projects/${projectId}/board`)
        }
        className={styles.backButton}
      >
        {t("projectSettings.backToBoard")}
      </Button>

      {/* General */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{t("projectSettings.general")}</div>
          <div className={styles.sectionDesc}>
            {t("projectSettings.generalDesc")}
          </div>
        </div>
        <div className={styles.sectionBody}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => updateProject(values)}
            requiredMark={false}
          >
            <Form.Item
              name="name"
              label={t("projectSettings.nameLabel")}
              rules={[
                { required: true, message: t("projectSettings.nameRequired") },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t("projectSettings.descriptionLabel")}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item
              name="sprintMode"
              label={t("projectSettings.sprintModeLabel")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isSavingGeneral}>
                {t("projectSettings.save")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

      {/* Board Columns */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{t("projectSettings.boardColumns")}</div>
          <div className={styles.sectionDesc}>
            {t("projectSettings.boardColumnsDesc")}
          </div>
        </div>
        <div className={styles.sectionBody}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleColumnDragEnd}
          >
            <SortableContext
              items={statuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.columnList}>
                {statuses.map((status) => (
                  <SortableColumnRow
                    key={status.id}
                    row={status}
                    disableRemove={statuses.length <= 1}
                    onChange={handleColumnChange}
                    onRemove={handleRemoveColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddColumn}
            block
            style={{ marginTop: 8 }}
          >
            {t("projectSettings.addColumn")}
          </Button>
          <Button
            type="primary"
            onClick={handleSaveStatuses}
            loading={isSavingStatuses}
            style={{ marginTop: 16 }}
          >
            {t("projectSettings.saveColumns")}
          </Button>
        </div>
      </div>

      {/* Members */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div className={styles.sectionTitle}>{t("projectSettings.members")}</div>
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setAddMemberModalOpen(true)}
            >
              {t("projectSettings.addMember")}
            </Button>
          </div>
          <div className={styles.sectionDesc}>
            {t("projectSettings.membersDesc")}
          </div>
        </div>
        <div className={styles.sectionBody}>
          {isLoadingMembers ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : (
            <div className={styles.memberList}>
              {members?.map((member) => (
                <div key={member.userId._id} className={styles.memberRow}>
                  <Avatar size={32} style={{ background: "#4a6cf7", flexShrink: 0 }}>
                    {member.userId.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>{member.userId.name}</div>
                    <div className={styles.memberEmail}>{member.userId.email}</div>
                  </div>
                  <Tag>{t(`members.role.${member.role}`)}</Tag>
                  {member.role !== "owner" && (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => setRemovingMember(member)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className={styles.dangerSection}>
        <div className={styles.dangerHeader}>
          <div className={styles.dangerTitle}>{t("projectSettings.dangerZone")}</div>
          <div className={styles.sectionDesc}>
            {t("projectSettings.dangerZoneDesc")}
          </div>
        </div>
        <div className={styles.sectionBody}>
          <Button
            danger
            loading={isArchiving}
            onClick={() => setArchiveModalOpen(true)}
          >
            {t("projectSettings.archiveProject")}
          </Button>
        </div>
      </div>

      <Modal
        title={t("projectSettings.addMemberTitle")}
        open={addMemberModalOpen}
        onCancel={closeAddMemberModal}
        footer={null}
        width={420}
        destroyOnClose
      >
        <Form
          form={addMemberForm}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => addMember(values.memberId)}
        >
          <Form.Item
            name="memberId"
            label={t("projectSettings.addMemberSelectLabel")}
            rules={[
              {
                required: true,
                message: t("projectSettings.addMemberSelectRequired"),
              },
            ]}
          >
            <Select
              placeholder={t("projectSettings.addMemberSelectPlaceholder")}
              notFoundContent={t("projectSettings.noMembersToAdd")}
              options={availableMembers.map((wm) => ({
                value: wm.userId._id,
                label: `${wm.userId.name} (${wm.userId.email})`,
              }))}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={closeAddMemberModal}>
                {t("projectSettings.cancel")}
              </Button>
              <Button type="primary" htmlType="submit" loading={isAddingMember}>
                {t("projectSettings.addMember")}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("projectSettings.removeMemberConfirmTitle")}
        open={!!removingMember}
        onCancel={() => setRemovingMember(null)}
        centered
        width={560}
        okText={t("projectSettings.removeMemberConfirmOk")}
        cancelText={t("projectSettings.cancel")}
        okButtonProps={{ danger: true, loading: isRemovingMember }}
        onOk={() =>
          removingMember && removeMember(removingMember.userId._id)
        }
      >
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          {t("projectSettings.removeMemberConfirmDesc", {
            name: removingMember?.userId.name,
          })}
        </p>
      </Modal>

      <Modal
        title={t("projectSettings.archiveConfirmTitle")}
        open={archiveModalOpen}
        onCancel={() => setArchiveModalOpen(false)}
        centered
        width={560}
        okText={t("projectSettings.archiveConfirmOk")}
        cancelText={t("projectSettings.cancel")}
        okButtonProps={{ danger: true, loading: isArchiving }}
        onOk={() => archiveProject()}
      >
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          {t("projectSettings.archiveConfirmDesc", { name: project.name })}
        </p>
      </Modal>
    </div>
  );
}
