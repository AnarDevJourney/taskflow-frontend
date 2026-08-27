import { useState } from "react";
import {
  Modal,
  Avatar,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Button,
  Checkbox,
  Progress,
  Tag,
  Tooltip,
  Divider,
} from "antd";
import { toast } from "@lib/toast";
import {
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Task, Priority, Comment } from "@types/index";
import { taskService, UpdateTaskDto } from "../services/taskService";
import { commentService } from "@features/comments/services/commentService";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { workspaceService } from "@features/workspaces/services/workspaceService";
import TaskAttachments from "@features/files/components/TaskAttachments";
import styles from "./TaskDetailModal.module.css";

dayjs.extend(relativeTime);

interface Props {
  task: Task;
  workspaceId: string;
  projectId: string;
  statuses: string[];
  open: boolean;
  onClose: () => void;
}

const priorityColors: Record<Priority, { bg: string; color: string }> = {
  [Priority.CRITICAL]: { bg: "#fff1f0", color: "#f5222d" },
  [Priority.HIGH]: { bg: "#fff7e6", color: "#fa8c16" },
  [Priority.MEDIUM]: { bg: "#f0f4ff", color: "#4a6cf7" },
  [Priority.LOW]: { bg: "#f5f5f5", color: "#8c8c8c" },
};

export default function TaskDetailModal({
  task,
  workspaceId,
  projectId,
  statuses,
  open,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [localChecklist, setLocalChecklist] = useState(task.checklist ?? []);

  // Right panel local state — nothing fires until Save
  const [sideStatus, setSideStatus] = useState(task.status);
  const [sidePriority, setSidePriority] = useState(task.priority);
  const [sideDueDate, setSideDueDate] = useState(task.dueDate);
  const [sideStoryPoints, setSideStoryPoints] = useState(task.storyPoints);
  const [sideAssigneeId, setSideAssigneeId] = useState(
    task.assigneeId?._id ?? null,
  );

  const hasChanges =
    sideStatus !== task.status ||
    sidePriority !== task.priority ||
    sideDueDate !== task.dueDate ||
    sideStoryPoints !== task.storyPoints ||
    sideAssigneeId !== (task.assigneeId?._id ?? null);

  const handleSideSave = () => {
    updateTask({
      status: sideStatus,
      priority: sidePriority,
      dueDate: sideDueDate,
      storyPoints: sideStoryPoints,
      assigneeId: sideAssigneeId,
    });
  };

  const handleSideCancel = () => {
    setSideStatus(task.status);
    setSidePriority(task.priority);
    setSideDueDate(task.dueDate);
    setSideStoryPoints(task.storyPoints);
    setSideAssigneeId(task.assigneeId?._id ?? null);
  };

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId),
    enabled: open,
  });

  const taskKey = `FE-${task.taskNumber}`;

  // ─── Invalidate helper ───────────────────────────────────────────
  // This modal is opened from both BoardPage (["tasks", workspaceId,
  // projectId]) and MyTasksPage (["my-tasks", workspaceId, userId, query]) —
  // invalidate both prefixes so whichever page opened it refetches.
  const invalidateTasks = () => {
    qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  // ─── Update task mutation ────────────────────────────────────────
  const { mutate: updateTask } = useMutation({
    mutationFn: (dto: UpdateTaskDto) =>
      taskService.update(workspaceId, projectId, task._id, dto),
    onSuccess: () => {
      invalidateTasks();
      toast.success(t("taskDetailModal.updateSuccess"));
    },
    onError: () => toast.error(t("taskDetailModal.updateFailed")),
  });

  // ─── Delete task mutation ────────────────────────────────────────
  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: () => taskService.remove(workspaceId, projectId, task._id),
    onSuccess: () => {
      invalidateTasks();
      setDeleteConfirmOpen(false);
      onClose();
      toast.success(t("taskDetailModal.deleted"));
    },
    onError: () => toast.error(t("taskDetailModal.deleteFailed")),
  });

  // ─── Comments ────────────────────────────────────────────────────
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", task._id],
    queryFn: () => commentService.getAll(workspaceId, projectId, task._id),
    enabled: open,
  });

  const { mutate: addComment, isPending: isAddingComment } = useMutation({
    mutationFn: () =>
      commentService.create(workspaceId, projectId, task._id, newComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", task._id] });
      setNewComment("");
    },
    onError: () => toast.error(t("taskDetailModal.addCommentFailed")),
  });

  const { mutate: updateComment } = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      commentService.update(workspaceId, projectId, task._id, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", task._id] });
      setEditingCommentId(null);
    },
    onError: () => toast.error(t("taskDetailModal.updateCommentFailed")),
  });

  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: (commentId: string) =>
      commentService.remove(workspaceId, projectId, task._id, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", task._id] });
      setDeleteCommentId(null);
    },
    onError: () => toast.error(t("taskDetailModal.deleteCommentFailed")),
  });

  // ─── Checklist ───────────────────────────────────────────────────
  // Toggling only flips local state. Nothing is sent to the server until
  // the user explicitly clicks Save — avoids one request per click.
  const { mutate: addChecklistItem } = useMutation({
    mutationFn: (title: string) =>
      taskService.addChecklistItem(workspaceId, projectId, task._id, title),
    onMutate: (title) => {
      setLocalChecklist((prev) => [
        ...prev,
        { title, completed: false, createdAt: new Date().toISOString() },
      ]);
      setNewChecklistItem("");
      setAddingChecklist(false);
    },
    onSuccess: invalidateTasks,
    onError: () => {
      setLocalChecklist(task.checklist);
      toast.error(t("taskDetailModal.addChecklistItemFailed"));
    },
  });

  const { mutate: toggleChecklistRequest, isPending: isSavingChecklist } = useMutation({
    mutationFn: (indexes: number[]) =>
      Promise.all(
        indexes.map((index) =>
          taskService.toggleChecklistItem(workspaceId, projectId, task._id, index),
        ),
      ),
    onSuccess: invalidateTasks,
    onError: () => {
      setLocalChecklist(task.checklist);
      toast.error(t("taskDetailModal.updateChecklistItemFailed"));
    },
  });

  const toggleChecklist = (index: number) => {
    setLocalChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const changedChecklistIndexes = localChecklist
    .map((item, i) => (item.completed !== task.checklist?.[i]?.completed ? i : -1))
    .filter((i) => i !== -1);
  const hasChecklistChanges = changedChecklistIndexes.length > 0;

  const handleChecklistSave = () => {
    toggleChecklistRequest(changedChecklistIndexes);
  };

  const handleChecklistCancel = () => {
    setLocalChecklist(task.checklist ?? []);
  };

  // ─── Checklist progress ──────────────────────────────────────────
  const completedCount = localChecklist.filter((i) => i.completed).length;
  const totalCount = localChecklist.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const priorityStyle = priorityColors[task.priority];

  return (
    <>
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      className={styles.modal}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.layout}>
        {/* ─── Left panel ─────────────────────────────────────── */}
        <div className={styles.left}>
          {/* Task key + priority */}
          <div className={styles.taskMeta}>
            <span className={styles.taskKey}>{taskKey}</span>
            <span
              className={styles.priorityBadge}
              style={{
                background: priorityStyle.bg,
                color: priorityStyle.color,
              }}
            >
              {t(`taskDetailModal.priorityLabels.${task.priority}`)}
            </span>
          </div>

          {/* Title */}
          {editingTitle ? (
            <>
              <Input
                className={styles.titleInput}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onPressEnter={() => {
                  if (titleValue.trim()) {
                    updateTask({ title: titleValue.trim() });
                  }
                  setEditingTitle(false);
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 4 }}>
                <Button
                  size="small"
                  type="primary"
                  disabled={!titleValue.trim()}
                  onClick={() => {
                    if (titleValue.trim()) {
                      updateTask({ title: titleValue.trim() });
                    }
                    setEditingTitle(false);
                  }}
                >
                  {t("taskDetailModal.save")}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }}
                >
                  {t("taskDetailModal.cancel")}
                </Button>
              </div>
            </>
          ) : (
            <div
              className={styles.title}
              onClick={() => {
                setTitleValue(task.title);
                setEditingTitle(true);
              }}
            >
              {task.title}
            </div>
          )}

          {/* Description */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {t("taskDetailModal.description")}
            </div>
            {editingDesc ? (
              <>
                <Input.TextArea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={4}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      updateTask({ description: descValue });
                      setEditingDesc(false);
                    }}
                  >
                    {t("taskDetailModal.save")}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setDescValue(task.description ?? "");
                      setEditingDesc(false);
                    }}
                  >
                    {t("taskDetailModal.cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <div
                className={styles.description}
                onClick={() => {
                  setDescValue(task.description ?? "");
                  setEditingDesc(true);
                }}
              >
                {task.description || (
                  <span className={styles.descPlaceholder}>
                    {t("taskDetailModal.descriptionPlaceholder")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Checklist */}
          {(localChecklist.length > 0 || addingChecklist) && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                {t("taskDetailModal.checklist")} — {completedCount}/
                {totalCount}
              </div>
              {totalCount > 0 && (
                <Progress
                  percent={progress}
                  size="small"
                  className={styles.checklistProgress}
                  strokeColor="#4a6cf7"
                />
              )}
              {localChecklist.map((item, index) => (
                <div key={index} className={styles.checklistItem}>
                  <Checkbox
                    checked={item.completed}
                    onChange={() => toggleChecklist(index)}
                  />
                  <span
                    className={`${styles.checklistItemText} ${item.completed ? styles.done : ""}`}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
              {hasChecklistChanges && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button
                    size="small"
                    type="primary"
                    loading={isSavingChecklist}
                    onClick={handleChecklistSave}
                  >
                    {t("taskDetailModal.save")}
                  </Button>
                  <Button
                    size="small"
                    disabled={isSavingChecklist}
                    onClick={handleChecklistCancel}
                  >
                    {t("taskDetailModal.cancel")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Add checklist item */}
          {addingChecklist ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Input
                size="small"
                placeholder={t("taskDetailModal.checklistItemPlaceholder")}
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onPressEnter={() => {
                  if (newChecklistItem.trim())
                    addChecklistItem(newChecklistItem.trim());
                }}
                autoFocus
              />
              <Button
                size="small"
                type="primary"
                disabled={!newChecklistItem.trim()}
                onClick={() => {
                  if (newChecklistItem.trim())
                    addChecklistItem(newChecklistItem.trim());
                }}
              >
                {t("taskDetailModal.add")}
              </Button>
              <Button size="small" onClick={() => setAddingChecklist(false)}>
                {t("taskDetailModal.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              className={styles.addChecklistBtn}
              onClick={() => setAddingChecklist(true)}
              style={{ marginBottom: 20 }}
            >
              {t("taskDetailModal.addChecklistItem")}
            </Button>
          )}

          <Divider style={{ margin: "4px 0 20px" }} />

          {/* Attachments */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {t("attachments.title")} ({task.attachments?.length ?? 0})
            </div>
            <TaskAttachments
              attachments={task.attachments ?? []}
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={task._id}
              onChanged={invalidateTasks}
              currentUserId={currentUser?._id}
            />
          </div>

          <Divider style={{ margin: "20px 0" }} />

          {/* Comments */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {t("taskDetailModal.comments")} ({comments.length})
            </div>

            {comments.map((comment: Comment) => (
              <div key={comment._id} className={styles.comment}>
                <Avatar
                  size={30}
                  src={comment.authorId?.avatarUrl ?? undefined}
                  style={{ background: "#4a6cf7", flexShrink: 0, fontSize: 12 }}
                >
                  {comment.authorId?.name?.[0]?.toUpperCase()}
                </Avatar>
                <div className={styles.commentBody}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAuthor}>
                      {comment.authorId?.name}
                      <span className={styles.commentDate}>
                        {dayjs(comment.createdAt).fromNow()}
                        {comment.editedAt && ` · ${t("taskDetailModal.edited")}`}
                      </span>
                    </div>

                    {editingCommentId !== comment._id &&
                      currentUser?._id === comment.authorId?._id &&
                      comment.deletedAt === null && (
                        <div className={styles.commentActions}>
                          <Tooltip title={t("taskDetailModal.edit")}>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingCommentId(comment._id);
                                setEditingCommentBody(comment.body);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t("taskDetailModal.delete")}>
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => setDeleteCommentId(comment._id)}
                            />
                          </Tooltip>
                        </div>
                      )}
                  </div>

                  {editingCommentId === comment._id ? (
                    <>
                      <Input.TextArea
                        className={styles.commentEditInput}
                        value={editingCommentBody}
                        onChange={(e) => setEditingCommentBody(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <Button
                          size="small"
                          type="primary"
                          disabled={!editingCommentBody.trim()}
                          onClick={() =>
                            updateComment({
                              id: comment._id,
                              body: editingCommentBody,
                            })
                          }
                        >
                          {t("taskDetailModal.save")}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingCommentId(null)}
                        >
                          {t("taskDetailModal.cancel")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.commentText}>{comment.body}</div>
                  )}
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <div className={styles.noComments}>
                {t("taskDetailModal.noComments")}
              </div>
            )}

            {/* Add comment */}
            <div className={styles.addComment}>
              <Avatar
                size={28}
                src={currentUser?.avatarUrl ?? undefined}
                style={{ background: "#4a6cf7", flexShrink: 0, fontSize: 11 }}
              >
                {currentUser?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Input.TextArea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t("taskDetailModal.addCommentPlaceholder")}
                rows={2}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.ctrlKey || e.metaKey) &&
                    newComment.trim()
                  ) {
                    addComment();
                  }
                }}
              />
            </div>
            {newComment.trim() && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={isAddingComment}
                  onClick={() => addComment()}
                >
                  {t("taskDetailModal.comment")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right panel ────────────────────────────────────── */}
        <div className={styles.right}>
          {/* Close button */}
          <Button
            className={styles.closeBtn}
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            size="small"
          />

          {/* Status */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.statusLabel")}
            </div>
            <Select
              value={sideStatus}
              style={{ width: "100%" }}
              onChange={(value) => setSideStatus(value)}
            >
              {statuses.map((s) => (
                <Select.Option key={s} value={s}>
                  {s}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Priority */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.priorityLabel")}
            </div>
            <Select
              value={sidePriority}
              style={{ width: "100%" }}
              onChange={(value) => setSidePriority(value)}
            >
              <Select.Option value={Priority.CRITICAL}>
                {t("taskDetailModal.priorityCritical")}
              </Select.Option>
              <Select.Option value={Priority.HIGH}>
                {t("taskDetailModal.priorityHigh")}
              </Select.Option>
              <Select.Option value={Priority.MEDIUM}>
                {t("taskDetailModal.priorityMedium")}
              </Select.Option>
              <Select.Option value={Priority.LOW}>
                {t("taskDetailModal.priorityLow")}
              </Select.Option>
            </Select>
          </div>

          {/* Assignee */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.assignee")}
            </div>
            <Select
              value={sideAssigneeId}
              allowClear
              placeholder={t("taskDetailModal.unassigned")}
              style={{ width: "100%" }}
              onChange={(value) => setSideAssigneeId(value ?? null)}
              onClear={() => setSideAssigneeId(null)}
              optionLabelProp="label"
            >
              {members.map((m) => (
                <Select.Option
                  key={m.userId._id}
                  value={m.userId._id}
                  label={m.userId.name}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar
                      size={18}
                      src={m.userId.avatarUrl ?? undefined}
                      style={{ background: "#4a6cf7", fontSize: 10 }}
                    >
                      {m.userId.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <span>{m.userId.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Reporter */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.reporter")}
            </div>
            <div className={styles.metaValue}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar
                  size={22}
                  src={task.reporterId?.avatarUrl ?? undefined}
                  style={{ background: "#4a6cf7", fontSize: 11 }}
                >
                  {task.reporterId?.name?.[0]?.toUpperCase()}
                </Avatar>
                <span style={{ fontSize: 14 }}>{task.reporterId?.name}</span>
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.dueDate")}
            </div>
            <DatePicker
              value={sideDueDate ? dayjs(sideDueDate) : null}
              style={{ width: "100%" }}
              onChange={(date) =>
                setSideDueDate(date ? date.toISOString() : null)
              }
            />
          </div>

          {/* Story points */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.storyPoints")}
            </div>
            <InputNumber
              value={sideStoryPoints}
              style={{ width: "100%" }}
              min={0}
              placeholder="—"
              onChange={(value) => setSideStoryPoints(value ?? null)}
            />
          </div>

          {/* Labels */}
          {(task.labels?.length ?? 0) > 0 && (
            <div className={styles.metaRow}>
              <div className={styles.metaLabel}>
                {t("taskDetailModal.labels")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {task.labels.map((label) => (
                  <Tag key={label} style={{ fontSize: 12 }}>
                    {label}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Created */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>
              {t("taskDetailModal.created")}
            </div>
            <div
              className={styles.metaValue}
              style={{ fontSize: 13, color: "#8c8c8c" }}
            >
              {dayjs(task.createdAt).format("MMM D, YYYY")}
            </div>
          </div>

          {/* Save / Cancel pending changes */}
          {hasChanges && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Button
                type="primary"
                size="small"
                style={{ flex: 1 }}
                onClick={handleSideSave}
              >
                {t("taskDetailModal.save")}
              </Button>
              <Button size="small" style={{ flex: 1 }} onClick={handleSideCancel}>
                {t("taskDetailModal.cancel")}
              </Button>
            </div>
          )}

          {/* Delete */}
          <div className={styles.deleteBtn}>
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              loading={isDeleting}
              block
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {t("taskDetailModal.deleteTask")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Delete confirmation */}
    <Modal
      title={t("taskDetailModal.deleteTaskConfirmTitle")}
      open={deleteConfirmOpen}
      onCancel={() => setDeleteConfirmOpen(false)}
      centered
      width={480}
      okText={t("taskDetailModal.delete")}
      cancelText={t("taskDetailModal.cancel")}
      okButtonProps={{ danger: true, loading: isDeleting }}
      onOk={() => deleteTask()}
    >
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
        {t("taskDetailModal.deleteTaskConfirmDesc")}
      </p>
    </Modal>

    {/* Delete comment confirmation */}
    <Modal
      title={t("taskDetailModal.deleteCommentConfirmTitle")}
      open={!!deleteCommentId}
      onCancel={() => setDeleteCommentId(null)}
      centered
      width={480}
      okText={t("taskDetailModal.delete")}
      cancelText={t("taskDetailModal.cancel")}
      okButtonProps={{ danger: true, loading: isDeletingComment }}
      onOk={() => deleteCommentId && deleteComment(deleteCommentId)}
    >
      <p style={{ fontSize: 15, lineHeight: 1.6 }}>
        {t("taskDetailModal.deleteCommentConfirmDesc")}
      </p>
    </Modal>
    </>
  );
}
