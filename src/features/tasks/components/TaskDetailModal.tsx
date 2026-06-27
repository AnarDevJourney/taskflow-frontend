import { useState, useRef } from "react";
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
  Popconfirm,
  message,
  Divider,
} from "antd";
import {
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Task, Priority, Comment } from "@types/index";
import { taskService, UpdateTaskDto } from "../services/taskService";
import { commentService } from "@features/comments/services/commentService";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
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
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description ?? "");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [localChecklist, setLocalChecklist] = useState(task.checklist);

  // Right panel local state — nothing fires until Save
  const [sideStatus, setSideStatus] = useState(task.status);
  const [sidePriority, setSidePriority] = useState(task.priority);
  const [sideDueDate, setSideDueDate] = useState(task.dueDate);
  const [sideStoryPoints, setSideStoryPoints] = useState(task.storyPoints);

  const hasChanges =
    sideStatus !== task.status ||
    sidePriority !== task.priority ||
    sideDueDate !== task.dueDate ||
    sideStoryPoints !== task.storyPoints;

  const handleSideSave = () => {
    updateTask({
      status: sideStatus,
      priority: sidePriority,
      dueDate: sideDueDate,
      storyPoints: sideStoryPoints,
    });
  };

  const handleSideCancel = () => {
    setSideStatus(task.status);
    setSidePriority(task.priority);
    setSideDueDate(task.dueDate);
    setSideStoryPoints(task.storyPoints);
  };

  const taskKey = `FE-${task.taskNumber}`;

  // ─── Invalidate helper ───────────────────────────────────────────
  const invalidateTasks = () =>
    qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });

  // ─── Update task mutation ────────────────────────────────────────
  const { mutate: updateTask } = useMutation({
    mutationFn: (dto: UpdateTaskDto) =>
      taskService.update(workspaceId, projectId, task._id, dto),
    onSuccess: invalidateTasks,
    onError: () => message.error("Failed to update task"),
  });

  // ─── Delete task mutation ────────────────────────────────────────
  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: () => taskService.remove(workspaceId, projectId, task._id),
    onSuccess: () => {
      invalidateTasks();
      onClose();
      message.success("Task deleted");
    },
    onError: () => message.error("Failed to delete task"),
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
    onError: () => message.error("Failed to add comment"),
  });

  const { mutate: updateComment } = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      commentService.update(workspaceId, projectId, task._id, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", task._id] });
      setEditingCommentId(null);
    },
    onError: () => message.error("Failed to update comment"),
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: (commentId: string) =>
      commentService.remove(workspaceId, projectId, task._id, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", task._id] }),
    onError: () => message.error("Failed to delete comment"),
  });

  // ─── Checklist ───────────────────────────────────────────────────
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
      message.error("Failed to add checklist item");
    },
  });

  const { mutate: toggleChecklist } = useMutation({
    mutationFn: (index: number) =>
      taskService.toggleChecklistItem(workspaceId, projectId, task._id, index),
    onMutate: (index) => {
      setLocalChecklist((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, completed: !item.completed } : item,
        ),
      );
    },
    onSuccess: invalidateTasks,
    onError: () => {
      setLocalChecklist(task.checklist);
      message.error("Failed to update checklist item");
    },
  });

  // ─── Checklist progress ──────────────────────────────────────────
  const completedCount = localChecklist.filter((i) => i.completed).length;
  const totalCount = localChecklist.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const priorityStyle = priorityColors[task.priority];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
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
              {task.priority}
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
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }}
                >
                  Cancel
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
            <div className={styles.sectionTitle}>Description</div>
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
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setDescValue(task.description ?? "");
                      setEditingDesc(false);
                    }}
                  >
                    Cancel
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
                    Add a description…
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Checklist */}
          {(localChecklist.length > 0 || addingChecklist) && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                Checklist — {completedCount}/{totalCount}
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
            </div>
          )}

          {/* Add checklist item */}
          {addingChecklist ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Input
                size="small"
                placeholder="Checklist item…"
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
                Add
              </Button>
              <Button size="small" onClick={() => setAddingChecklist(false)}>
                Cancel
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
              Add checklist item
            </Button>
          )}

          <Divider style={{ margin: "4px 0 20px" }} />

          {/* Comments */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              Comments ({comments.length})
            </div>

            {comments.map((comment: Comment) => (
              <div key={comment._id} className={styles.comment}>
                <Avatar
                  size={28}
                  style={{ background: "#4a6cf7", flexShrink: 0, fontSize: 11 }}
                >
                  {comment.authorId?.name?.[0]?.toUpperCase()}
                </Avatar>
                <div className={styles.commentBody}>
                  <div className={styles.commentAuthor}>
                    {comment.authorId?.name}
                    <span className={styles.commentDate}>
                      {dayjs(comment.createdAt).fromNow()}
                      {comment.editedAt && " (edited)"}
                    </span>
                  </div>

                  {editingCommentId === comment._id ? (
                    <>
                      <Input.TextArea
                        value={editingCommentBody}
                        onChange={(e) => setEditingCommentBody(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() =>
                            updateComment({
                              id: comment._id,
                              body: editingCommentBody,
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingCommentId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.commentText}>{comment.body}</div>
                      {currentUser?._id === comment.authorId?._id &&
                        comment.deletedAt === null && (
                          <div className={styles.commentActions}>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingCommentId(comment._id);
                                setEditingCommentBody(comment.body);
                              }}
                            />
                            <Popconfirm
                              title="Delete comment?"
                              onConfirm={() => deleteComment(comment._id)}
                              okText="Delete"
                              okType="danger"
                            >
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Add comment */}
            <div className={styles.addComment}>
              <Avatar
                size={28}
                style={{ background: "#4a6cf7", flexShrink: 0, fontSize: 11 }}
              >
                {currentUser?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Input.TextArea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
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
                  Comment
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
            <div className={styles.metaLabel}>Status</div>
            <Select
              value={sideStatus}
              style={{ width: "100%" }}
              size="small"
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
            <div className={styles.metaLabel}>Priority</div>
            <Select
              value={sidePriority}
              style={{ width: "100%" }}
              size="small"
              onChange={(value) => setSidePriority(value)}
            >
              <Select.Option value={Priority.CRITICAL}>
                🔴 Critical
              </Select.Option>
              <Select.Option value={Priority.HIGH}>🟠 High</Select.Option>
              <Select.Option value={Priority.MEDIUM}>🔵 Medium</Select.Option>
              <Select.Option value={Priority.LOW}>⚪ Low</Select.Option>
            </Select>
          </div>

          {/* Assignee */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Assignee</div>
            <div className={styles.metaValue}>
              {task.assigneeId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Avatar
                    size={20}
                    style={{ background: "#4a6cf7", fontSize: 10 }}
                  >
                    {task.assigneeId.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <span style={{ fontSize: 13 }}>{task.assigneeId.name}</span>
                </div>
              ) : (
                <span style={{ color: "#bfbfbf", fontSize: 13 }}>
                  Unassigned
                </span>
              )}
            </div>
          </div>

          {/* Reporter */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Reporter</div>
            <div className={styles.metaValue}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar
                  size={20}
                  style={{ background: "#4a6cf7", fontSize: 10 }}
                >
                  {task.reporterId?.name?.[0]?.toUpperCase()}
                </Avatar>
                <span style={{ fontSize: 13 }}>{task.reporterId?.name}</span>
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Due Date</div>
            <DatePicker
              value={sideDueDate ? dayjs(sideDueDate) : null}
              size="small"
              style={{ width: "100%" }}
              onChange={(date) =>
                setSideDueDate(date ? date.toISOString() : null)
              }
            />
          </div>

          {/* Story points */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Story Points</div>
            <InputNumber
              value={sideStoryPoints}
              size="small"
              style={{ width: "100%" }}
              min={0}
              placeholder="—"
              onChange={(value) => setSideStoryPoints(value ?? null)}
            />
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className={styles.metaRow}>
              <div className={styles.metaLabel}>Labels</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {task.labels.map((label) => (
                  <Tag key={label} style={{ fontSize: 11 }}>
                    {label}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Created */}
          <div className={styles.metaRow}>
            <div className={styles.metaLabel}>Created</div>
            <div
              className={styles.metaValue}
              style={{ fontSize: 12, color: "#8c8c8c" }}
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
                Save
              </Button>
              <Button size="small" style={{ flex: 1 }} onClick={handleSideCancel}>
                Cancel
              </Button>
            </div>
          )}

          {/* Delete */}
          <div className={styles.deleteBtn}>
            <Popconfirm
              title="Delete this task?"
              description="This action cannot be undone."
              onConfirm={() => deleteTask()}
              okText="Delete"
              okType="danger"
            >
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={isDeleting}
                block
              >
                Delete task
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>
    </Modal>
  );
}
