import { useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { useTranslation } from "react-i18next";
import { Button, Input, Select, Skeleton } from "antd";
import { toast } from "@lib/toast";
import {
  CheckSquareOutlined,
  ClearOutlined,
  CloseOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useProject } from "@features/projects/hooks/useProjects";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { workspaceService } from "@features/workspaces/services/workspaceService";
import { useTasks } from "../hooks/useTasks";
import { taskService, CreateTaskDto } from "../services/taskService";
import { Task, PaginatedResponse, Priority } from "@types/index";
import BoardColumn from "../components/BoardColumn";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import styles from "./BoardPage.module.css";

type DueFilter = "overdue" | "thisWeek" | "none";

export default function BoardPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();

  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragCount, setDragCount] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("To Do");
  // `?task=<id>` is the single source of truth for which task's detail modal
  // is open — that makes the notification deep links (and the browser's back
  // button) work without a second copy of the state to keep in sync
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("task");

  const openTaskDetail = useCallback(
    (taskId: string) => {
      setSearchParams((params) => {
        params.set("task", taskId);
        return params;
      });
    },
    [setSearchParams],
  );

  const closeTaskDetail = useCallback(() => {
    setSearchParams(
      (params) => {
        params.delete("task");
        return params;
      },
      { replace: true },
    );
  }, [setSearchParams]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Filters ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  // Seeded once from `?priority=` — the dashboard's priority donut deep-links
  // here this way when it's scoped to a single project. A lazy `useState`
  // initializer only ever runs on mount, so this is a one-time seed; the
  // Select below is the only thing that changes it afterwards, same as any
  // other filter here (there is no two-way URL sync for filters, unlike
  // `?task=`).
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(() => {
    const fromUrl = searchParams.get("priority");
    return fromUrl && Object.values(Priority).includes(fromUrl as Priority)
      ? [fromUrl as Priority]
      : [];
  });
  // memberId | "me" | "unassigned". Seeded once from `?assignee=` the same
  // way as `priorityFilter` above — the dashboard's workload chart deep-links
  // here by memberId when it's scoped to a single project.
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(
    () => searchParams.get("assignee"),
  );
  const [dueFilter, setDueFilter] = useState<DueFilter | null>(null);

  const { data: project } = useProject(workspaceId ?? "", projectId ?? "");
  const { data: currentUser } = useCurrentUser();
  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId ?? ""),
    enabled: !!workspaceId,
  });

  const { data: tasksData, isLoading } = useTasks(
    workspaceId ?? "",
    projectId ?? "",
  );

  const allTasks = useMemo(() => tasksData?.items ?? [], [tasksData]);

  const hasActiveFilters =
    !!searchQuery ||
    priorityFilter.length > 0 ||
    !!assigneeFilter ||
    !!dueFilter;

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter([]);
    setAssigneeFilter(null);
    setDueFilter(null);
  };

  const tasks = useMemo(() => {
    if (!hasActiveFilters) return allTasks;

    const query = searchQuery.trim().toLowerCase();
    const now = dayjs();
    const weekFromNow = now.add(7, "day");

    return allTasks.filter((task) => {
      if (
        query &&
        !task.title.toLowerCase().includes(query) &&
        !`${task.taskNumber}`.includes(query)
      ) {
        return false;
      }

      if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) {
        return false;
      }

      if (assigneeFilter === "unassigned" && task.assigneeId) return false;
      if (assigneeFilter === "me" && task.assigneeId?._id !== currentUser?._id) {
        return false;
      }
      if (
        assigneeFilter &&
        assigneeFilter !== "me" &&
        assigneeFilter !== "unassigned" &&
        task.assigneeId?._id !== assigneeFilter
      ) {
        return false;
      }

      if (dueFilter === "none" && task.dueDate) return false;
      if (dueFilter === "overdue" && !(task.dueDate && dayjs(task.dueDate).isBefore(now, "day"))) {
        return false;
      }
      if (
        dueFilter === "thisWeek" &&
        !(
          task.dueDate &&
          !dayjs(task.dueDate).isBefore(now, "day") &&
          dayjs(task.dueDate).isBefore(weekFromNow, "day")
        )
      ) {
        return false;
      }

      return true;
    });
  }, [allTasks, hasActiveFilters, searchQuery, priorityFilter, assigneeFilter, dueFilter, currentUser]);

  const selectedTask = selectedTaskId
    ? (allTasks.find((t) => t._id === selectedTaskId) ?? null)
    : null;

  // ─── Group tasks by status ───────────────────────────────────────
  // `tasksByStatus` (filtered) drives what's rendered in each column.
  // `allTasksByStatus` (unfiltered) is what the drag-and-drop math below
  // must use — order/position is a property of the whole column, and
  // computing it from only the currently-visible (filtered) tasks would
  // corrupt ordering relative to any tasks hidden by the active filters.
  const tasksByStatus = (project?.statuses ?? []).reduce<
    Record<string, Task[]>
  >((acc, status) => {
    acc[status.name] = tasks
      .filter((t) => t.status === status.name)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  const allTasksByStatus = (project?.statuses ?? []).reduce<
    Record<string, Task[]>
  >((acc, status) => {
    acc[status.name] = allTasks
      .filter((t) => t.status === status.name)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  // Board-column order, used to keep a stable relative order when moving a
  // multi-selection whose tasks originally lived in different columns.
  const statusOrder = (project?.statuses ?? []).reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.name] = s.order;
      return acc;
    },
    {},
  );

  const toggleSelectTask = useCallback((task: Task) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task._id)) next.delete(task._id);
      else next.add(task._id);
      return next;
    });
  }, []);

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

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
    onError: () => toast.error(t("board.createTaskFailed")),
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
      toast.error(t("board.moveTaskFailed"));
    },
  });

  // ─── Bulk reorder (multi-select drag) ─────────────────────────────
  const { mutate: reorderTasksBulk } = useMutation({
    mutationFn: ({
      taskIds,
      status,
      order,
    }: {
      taskIds: string[];
      status: string;
      order: number;
    }) =>
      taskService.reorderBulk(workspaceId ?? "", projectId ?? "", {
        taskIds,
        status,
        order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
      toast.error(t("board.moveTasksFailed"));
    },
  });

  // ─── DnD handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = allTasks.find((t) => t._id === event.active.id);
      if (task) setActiveTask(task);

      const isMultiDrag =
        selectMode && selectedIds.has(String(event.active.id)) && selectedIds.size > 1;
      setDragCount(isMultiDrag ? selectedIds.size : 1);
    },
    [allTasks, selectMode, selectedIds],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Multi-drag: never patch status mid-hover. Mutating just the one
      // physically-dragged card here would pull it out of its selected
      // group's status/order for the sort in handleDragEnd, scrambling the
      // selection's relative order on drop. The whole selection's move is
      // resolved atomically at drop time instead.
      const isMultiDrag =
        selectMode &&
        selectedIds.has(String(active.id)) &&
        selectedIds.size > 1;
      if (isMultiDrag) return;

      const activeTask = allTasks.find((t) => t._id === active.id);
      if (!activeTask) return;

      // over a column (status name) or over another task
      const overId = String(over.id);
      const overStatus =
        project?.statuses.find((s) => s.name === overId)?.name ??
        allTasks.find((t) => t._id === overId)?.status;

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
    [allTasks, project, workspaceId, projectId, qc, selectMode, selectedIds],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      // No valid drop target (dropped outside any column, or the drag was
      // released before dnd-kit resolved a collision) — discard whatever
      // handleDragOver optimistically patched and resync with the server.
      if (!over) {
        qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
        return;
      }

      const draggedTaskId = String(active.id);
      const draggedTask = allTasks.find((t) => t._id === draggedTaskId);
      if (!draggedTask) return;

      const overId = String(over.id);
      const overStatus =
        project?.statuses.find((s) => s.name === overId)?.name ??
        allTasks.find((t) => t._id === overId)?.status ??
        draggedTask.status;

      const isMultiDrag =
        selectMode && selectedIds.has(draggedTaskId) && selectedIds.size > 1;

      if (isMultiDrag) {
        // Move every selected task together, keeping their original
        // relative order (sorted by column, then position within it).
        const orderedMoved = allTasks
          .filter((t) => selectedIds.has(t._id))
          .sort(
            (a, b) =>
              (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0) ||
              a.order - b.order,
          );

        const remainingTarget = (allTasksByStatus[overStatus] ?? []).filter(
          (t) => !selectedIds.has(t._id),
        );
        const overIndex = remainingTarget.findIndex((t) => t._id === overId);
        const newOrder =
          overIndex >= 0 ? overIndex : remainingTarget.length;

        const reorderedTarget = [
          ...remainingTarget.slice(0, newOrder),
          ...orderedMoved,
          ...remainingTarget.slice(newOrder),
        ].map((t, i) => ({ ...t, status: overStatus, order: i }));

        const sourceStatuses = new Set(orderedMoved.map((t) => t.status));
        sourceStatuses.delete(overStatus);

        qc.setQueryData(
          ["tasks", workspaceId, projectId, {}],
          (old: PaginatedResponse<Task> | undefined) => {
            if (!old) return old;

            const reorderedSources = [...sourceStatuses].flatMap((status) =>
              (allTasksByStatus[status] ?? [])
                .filter((t) => !selectedIds.has(t._id))
                .map((t, i) => ({ ...t, order: i })),
            );

            const patched = new Map(
              [...reorderedTarget, ...reorderedSources].map((t) => [
                t._id,
                t,
              ]),
            );

            return {
              ...old,
              items: old.items.map((t) => patched.get(t._id) ?? t),
            };
          },
        );

        reorderTasksBulk({
          taskIds: orderedMoved.map((t) => t._id),
          status: overStatus,
          order: newOrder,
        });

        setSelectedIds(new Set());
        return;
      }

      // Work out the final position with arrayMove semantics, including the
      // dragged task itself in the target column's array (it may already be
      // listed there from handleDragOver's optimistic status patch — if not,
      // append it). This correctly handles every case, including dropping
      // back onto itself (closestCorners commonly resolves `over` to the
      // active item on small movements — that must NOT be treated as "no
      // drop happened", or the optimistic column-switch from handleDragOver
      // would get stuck without ever being persisted or reverted).
      const columnTasks = [...(allTasksByStatus[overStatus] ?? [])];
      let activeIndex = columnTasks.findIndex((t) => t._id === draggedTaskId);
      if (activeIndex === -1) {
        columnTasks.push(draggedTask);
        activeIndex = columnTasks.length - 1;
      }
      const overIndex = columnTasks.findIndex((t) => t._id === overId);
      const targetIndex = overIndex >= 0 ? overIndex : columnTasks.length - 1;

      const reorderedTarget = arrayMove(
        columnTasks,
        activeIndex,
        targetIndex,
      ).map((t, i) => ({ ...t, status: overStatus, order: i }));
      const newOrder = reorderedTarget.findIndex(
        (t) => t._id === draggedTaskId,
      );

      // No-op drop (dropped back exactly where it already was) — skip the
      // request but still resync in case handleDragOver left a stray patch.
      const sourceStatus = draggedTask.status;
      if (sourceStatus === overStatus && draggedTask.order === newOrder) {
        qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
        return;
      }

      // Optimistic update — apply the new column/position locally so the
      // board reflects the move instantly, instead of waiting on the
      // invalidate/refetch round-trip.
      qc.setQueryData(
        ["tasks", workspaceId, projectId, {}],
        (old: PaginatedResponse<Task> | undefined) => {
          if (!old) return old;

          const reorderedSource =
            sourceStatus === overStatus
              ? []
              : (allTasksByStatus[sourceStatus] ?? [])
                  .filter((t) => t._id !== draggedTaskId)
                  .map((t, i) => ({ ...t, order: i }));

          const patched = new Map(
            [...reorderedTarget, ...reorderedSource].map((t) => [t._id, t]),
          );

          return {
            ...old,
            items: old.items.map((t) => patched.get(t._id) ?? t),
          };
        },
      );

      reorderTask({
        taskId: draggedTask._id,
        status: overStatus,
        order: newOrder,
      });
    },
    [
      allTasks,
      project,
      allTasksByStatus,
      statusOrder,
      selectMode,
      selectedIds,
      reorderTask,
      reorderTasksBulk,
      qc,
      workspaceId,
      projectId,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setDragCount(1);
    // The drag was aborted (e.g. Escape) — discard any optimistic status
    // patch handleDragOver may have applied while hovering.
    qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
  }, [qc, workspaceId, projectId]);

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectMode && selectedIds.size > 0 && (
            <span style={{ fontSize: 13, color: "#8c8c8c" }}>
              {t("board.selectedCount", { count: selectedIds.size })}
            </span>
          )}
          <Button
            type={selectMode ? "primary" : "default"}
            icon={selectMode ? <CloseOutlined /> : <CheckSquareOutlined />}
            onClick={toggleSelectMode}
          >
            {selectMode ? t("board.cancelSelect") : t("board.select")}
          </Button>
          {project.sprintMode && (
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/projects/${projectId}/sprints`,
                )
              }
            >
              {t("board.sprints")}
            </Button>
          )}
          <Button
            icon={<SettingOutlined />}
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/projects/${projectId}/settings`,
              )
            }
          >
            {t("board.settings")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddTask("To Do")}
          >
            {t("board.addTask")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Input
          allowClear
          placeholder={t("board.searchPlaceholder")}
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 220 }}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder={t("board.priorityFilterPlaceholder")}
          value={priorityFilter}
          onChange={setPriorityFilter}
          style={{ minWidth: 180 }}
          maxTagCount="responsive"
        >
          {Object.values(Priority).map((p) => (
            <Select.Option key={p} value={p}>
              {t(`taskDetailModal.priorityLabels.${p}`)}
            </Select.Option>
          ))}
        </Select>
        <Select
          allowClear
          placeholder={t("board.assigneeFilterPlaceholder")}
          value={assigneeFilter}
          onChange={(value) => setAssigneeFilter(value ?? null)}
          style={{ minWidth: 170 }}
        >
          <Select.Option value="me">{t("board.assigneeMe")}</Select.Option>
          <Select.Option value="unassigned">
            {t("board.assigneeUnassigned")}
          </Select.Option>
          {members.map((m) => (
            <Select.Option key={m.userId._id} value={m.userId._id}>
              {m.userId.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          allowClear
          placeholder={t("board.dueFilterPlaceholder")}
          value={dueFilter}
          onChange={(value) => setDueFilter(value ?? null)}
          style={{ minWidth: 160 }}
        >
          <Select.Option value="overdue">
            {t("board.dueOverdue")}
          </Select.Option>
          <Select.Option value="thisWeek">
            {t("board.dueThisWeek")}
          </Select.Option>
          <Select.Option value="none">{t("board.dueNone")}</Select.Option>
        </Select>
        {hasActiveFilters && (
          <Button icon={<ClearOutlined />} type="text" onClick={clearFilters}>
            {t("board.clearFilters")}
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
                onTaskClick={(task) => openTaskDetail(task._id)}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectTask}
              />
            ))}
        </div>

        {/* Drag overlay — shows card while dragging */}
        <DragOverlay>
          {activeTask ? (
            dragCount > 1 ? (
              <div className={styles.multiDragOverlay}>
                <TaskCard task={activeTask} onClick={() => {}} />
                <div className={styles.multiDragBadge}>+{dragCount - 1}</div>
              </div>
            ) : (
              <TaskCard task={activeTask} onClick={() => {}} />
            )
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
          onClose={closeTaskDetail}
        />
      )}
    </>
  );
}
