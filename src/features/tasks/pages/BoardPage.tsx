import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useNavigate } from "react-router-dom";
import { Button, Skeleton, message } from "antd";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProject } from "@features/projects/hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { taskService, CreateTaskDto } from "../services/taskService";
import { Task, PaginatedResponse } from "@types/index";
import BoardColumn from "../components/BoardColumn";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import styles from "./BoardPage.module.css";

export default function BoardPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("To Do");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: project } = useProject(workspaceId ?? "", projectId ?? "");

  const { data: tasksData, isLoading } = useTasks(
    workspaceId ?? "",
    projectId ?? "",
  );

  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);

  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t._id === selectedTaskId) ?? null)
    : null;

  // ─── Group tasks by status ───────────────────────────────────────
  const tasksByStatus = (project?.statuses ?? []).reduce<
    Record<string, Task[]>
  >((acc, status) => {
    acc[status.name] = tasks
      .filter((t) => t.status === status.name)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  // ─── Sensors ────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // require 5px move before drag starts
    }),
  );

  // ─── Create task ────────────────────────────────────────────────
  const { mutate: createTask, isPending: isCreating } = useMutation({
    mutationFn: (dto: CreateTaskDto) =>
      taskService.create(workspaceId ?? "", projectId ?? "", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
      setCreateModalOpen(false);
    },
    onError: () => message.error("Failed to create task"),
  });

  // ─── Reorder task ────────────────────────────────────────────────
  const { mutate: reorderTask } = useMutation({
    mutationFn: ({
      taskId,
      status,
      order,
    }: {
      taskId: string;
      status: string;
      order: number;
    }) =>
      taskService.reorder(workspaceId ?? "", projectId ?? "", taskId, {
        status,
        order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
      message.error("Failed to move task");
    },
  });

  // ─── DnD handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t._id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeTask = tasks.find((t) => t._id === active.id);
      if (!activeTask) return;

      // over a column (status name) or over another task
      const overId = String(over.id);
      const overStatus =
        project?.statuses.find((s) => s.name === overId)?.name ??
        tasks.find((t) => t._id === overId)?.status;

      if (!overStatus || activeTask.status === overStatus) return;

      // optimistic update — move task to new column in cache
      qc.setQueryData(
        ["tasks", workspaceId, projectId, {}],
        (old: PaginatedResponse<Task> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((t) =>
              t._id === active.id ? { ...t, status: overStatus } : t,
            ),
          };
        },
      );
    },
    [tasks, project, workspaceId, projectId, qc],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const draggedTask = tasks.find((t) => t._id === active.id);
      if (!draggedTask) return;

      const overId = String(over.id);
      const overStatus =
        project?.statuses.find((s) => s.name === overId)?.name ??
        tasks.find((t) => t._id === overId)?.status ??
        draggedTask.status;

      const columnTasks = tasksByStatus[overStatus] ?? [];
      const activeIndex = columnTasks.findIndex(
        (t) => t._id === String(active.id),
      );
      const overIndex = columnTasks.findIndex((t) => t._id === overId);
      const newOrder = overIndex >= 0 ? overIndex : columnTasks.length;

      // Optimistic update for same-column reorder (cross-column is handled in handleDragOver)
      if (
        draggedTask.status === overStatus &&
        activeIndex >= 0 &&
        overIndex >= 0 &&
        activeIndex !== overIndex
      ) {
        qc.setQueryData(
          ["tasks", workspaceId, projectId, {}],
          (old: PaginatedResponse<Task> | undefined) => {
            if (!old) return old;
            const reordered = arrayMove(
              columnTasks,
              activeIndex,
              overIndex,
            ).map((t, i) => ({ ...t, order: i }));
            return {
              ...old,
              items: old.items.map(
                (t) => reordered.find((r) => r._id === t._id) ?? t,
              ),
            };
          },
        );
      }

      reorderTask({
        taskId: draggedTask._id,
        status: overStatus,
        order: newOrder,
      });
    },
    [tasks, project, tasksByStatus, reorderTask, qc, workspaceId, projectId],
  );

  const handleAddTask = (status: string) => {
    setDefaultStatus(status);
    setCreateModalOpen(true);
  };

  if (isLoading || !project) {
    return (
      <div className={styles.board}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ width: 280, flexShrink: 0 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.projectKey}>{project.key}</span>
          <span className={styles.projectName}>{project.name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<SettingOutlined />}
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/projects/${projectId}/settings`,
              )
            }
          >
            Settings
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddTask("To Do")}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {(project.statuses ?? [])
            .sort((a, b) => a.order - b.order)
            .map((status) => (
              <BoardColumn
                key={status.name}
                status={status}
                tasks={tasksByStatus[status.name] ?? []}
                onAddTask={handleAddTask}
                onTaskClick={(task) => setSelectedTaskId(task._id)}
              />
            ))}
        </div>

        {/* Drag overlay — shows card while dragging */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create task modal */}
      <CreateTaskModal
        open={createModalOpen}
        defaultStatus={defaultStatus}
        statuses={(project.statuses ?? []).map((s) => s.name)}
        onSubmit={createTask}
        onClose={() => setCreateModalOpen(false)}
        isPending={isCreating}
      />
      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          key={selectedTask._id}
          task={selectedTask}
          workspaceId={workspaceId ?? ""}
          projectId={projectId ?? ""}
          statuses={project.statuses.map((s) => s.name)}
          open={!!selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
