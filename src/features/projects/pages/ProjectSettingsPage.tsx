import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
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
import { StatusConfig } from "@types/index";
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
        placeholder="WIP limit"
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
      message.success("Project updated");
    },
    onError: () => message.error("Failed to update project"),
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
      message.success("Columns updated");
    },
    onError: () => message.error("Failed to update columns"),
  });

  const handleAddColumn = () => {
    setStatuses((prev) => [
      ...prev,
      {
        id: makeId(),
        name: "New Column",
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

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) =>
      projectService.removeMember(
        workspaceId ?? "",
        projectId ?? "",
        memberId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      message.success("Member removed");
    },
    onError: () => message.error("Failed to remove member"),
  });

  // ─── Danger zone ────────────────────────────────────────────────
  const { mutate: archiveProject, isPending: isArchiving } = useMutation({
    mutationFn: () =>
      projectService.archive(workspaceId ?? "", projectId ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      message.success("Project archived");
      navigate(`/workspaces/${workspaceId}/projects`);
    },
    onError: () => message.error("Failed to archive project"),
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
        Back to board
      </Button>

      {/* General */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>General</div>
          <div className={styles.sectionDesc}>
            Basic project details and settings
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
              label="Project name"
              rules={[{ required: true, message: "Please enter a project name" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item
              name="sprintMode"
              label="Sprint mode"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isSavingGeneral}>
                Save
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

      {/* Board Columns */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Board Columns</div>
          <div className={styles.sectionDesc}>
            Configure the Kanban columns for this project
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
            Add column
          </Button>
          <Button
            type="primary"
            onClick={handleSaveStatuses}
            loading={isSavingStatuses}
            style={{ marginTop: 16 }}
          >
            Save columns
          </Button>
        </div>
      </div>

      {/* Members */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Members</div>
          <div className={styles.sectionDesc}>
            People with access to this project
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
                  <Tag>{member.role}</Tag>
                  {member.role !== "owner" && (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeMember(member.userId._id)}
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
          <div className={styles.dangerTitle}>Danger Zone</div>
          <div className={styles.sectionDesc}>
            Irreversible and destructive actions
          </div>
        </div>
        <div className={styles.sectionBody}>
          <Popconfirm
            title="Archive this project?"
            description="This will soft-delete the project. It can be restored later."
            onConfirm={() => archiveProject()}
            okText="Archive"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={isArchiving}>
              Archive project
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}
