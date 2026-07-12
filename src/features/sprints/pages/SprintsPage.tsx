import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Empty, Skeleton, Progress, Input, message } from "antd";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProject } from "@features/projects/hooks/useProjects";
import { useTasks } from "@features/tasks/hooks/useTasks";
import { taskService } from "@features/tasks/services/taskService";
import TaskCard from "@features/tasks/components/TaskCard";
import TaskDetailModal from "@features/tasks/components/TaskDetailModal";
import { Sprint, SprintStatus, Task } from "@types/index";
import { useSprints } from "../hooks/useSprints";
import {
  sprintService,
  CreateSprintDto,
  IncompleteTaskAction,
} from "../services/sprintService";
import SprintCard from "../components/SprintCard";
import VelocityChart from "../components/VelocityChart";
import BurndownChart from "../components/BurndownChart";
import CreateSprintModal from "../components/CreateSprintModal";
import CompleteSprintModal from "../components/CompleteSprintModal";
import AddTasksToSprintModal from "../components/AddTasksToSprintModal";
import styles from "./SprintsPage.module.css";

export default function SprintsPage() {
  const { workspaceId, projectId } = useParams<{
    workspaceId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const wsId = workspaceId ?? "";
  const prId = projectId ?? "";

  const { data: project } = useProject(wsId, prId);
  const { data: sprints, isLoading: sprintsLoading } = useSprints(wsId, prId);
  const { data: tasksData } = useTasks(wsId, prId);
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);

  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [addTasksModalOpen, setAddTasksModalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    if (!sprints || selectedSprintId) return;
    const active = sprints.find((s) => s.status === SprintStatus.ACTIVE);
    if (active) setSelectedSprintId(active._id);
    else if (sprints.length > 0) setSelectedSprintId(sprints[0]._id);
  }, [sprints, selectedSprintId]);

  const selectedSprint = sprints?.find((s) => s._id === selectedSprintId) ?? null;
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t._id === selectedTaskId) ?? null
    : null;

  const sprintTasks = selectedSprint
    ? tasks.filter((t) => t.sprintId === selectedSprint._id)
    : [];
  const backlogTasks = tasks.filter((t) => t.sprintId === null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["sprints", wsId, prId] });
    qc.invalidateQueries({ queryKey: ["tasks", wsId, prId] });
  };

  // ─── Burndown (only for completed sprint) ───────────────────────
  const { data: burndown } = useQuery({
    queryKey: ["sprint-burndown", wsId, prId, selectedSprint?._id],
    queryFn: () => sprintService.getBurndown(wsId, prId, selectedSprint!._id),
    enabled: !!selectedSprint && selectedSprint.status === SprintStatus.COMPLETED,
  });

  // ─── Velocity ────────────────────────────────────────────────────
  const { data: velocity } = useQuery({
    queryKey: ["sprint-velocity", wsId, prId],
    queryFn: () => sprintService.getVelocity(wsId, prId),
    enabled: !!wsId && !!prId,
  });

  // ─── Mutations ───────────────────────────────────────────────────
  const { mutate: createSprint, isPending: isCreating } = useMutation({
    mutationFn: (dto: CreateSprintDto) => sprintService.create(wsId, prId, dto),
    onSuccess: (sprint) => {
      invalidateAll();
      setCreateModalOpen(false);
      setSelectedSprintId(sprint._id);
    },
    onError: () => message.error("Failed to create sprint"),
  });

  const { mutate: updateGoal } = useMutation({
    mutationFn: (goal: string) =>
      sprintService.update(wsId, prId, selectedSprint!._id, { goal }),
    onSuccess: () => {
      invalidateAll();
      setEditingGoal(false);
    },
    onError: () => message.error("Failed to update goal"),
  });

  const { mutate: startSprint, isPending: isStarting } = useMutation({
    mutationFn: () => sprintService.start(wsId, prId, selectedSprint!._id),
    onSuccess: () => {
      invalidateAll();
      message.success("Sprint started");
    },
    onError: () => message.error("Failed to start sprint"),
  });

  const { mutate: completeSprint, isPending: isCompleting } = useMutation({
    mutationFn: ({
      action,
      nextSprintId,
    }: {
      action: IncompleteTaskAction;
      nextSprintId?: string;
    }) =>
      sprintService.complete(wsId, prId, selectedSprint!._id, {
        incompleteTaskAction: action,
        nextSprintId,
      }),
    onSuccess: () => {
      invalidateAll();
      setCompleteModalOpen(false);
      message.success("Sprint completed");
    },
    onError: () => message.error("Failed to complete sprint"),
  });

  const { mutate: addTasksToSprint, isPending: isAddingTasks } = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(
        taskIds.map((taskId) =>
          taskService.update(wsId, prId, taskId, {
            sprintId: selectedSprint!._id,
          }),
        ),
      );
    },
    onSuccess: () => {
      invalidateAll();
      setAddTasksModalOpen(false);
      message.success("Tasks added to sprint");
    },
    onError: () => message.error("Failed to add tasks"),
  });

  if (!project) {
    return (
      <div className={styles.page}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const completedCount = sprintTasks.filter((t) =>
    project.statuses.length > 0
      ? t.status === project.statuses[project.statuses.length - 1].name
      : false,
  ).length;
  const progressPct =
    sprintTasks.length > 0
      ? Math.round((completedCount / sprintTasks.length) * 100)
      : 0;

  const otherPlannedSprints = (sprints ?? []).filter(
    (s) => s.status === SprintStatus.PLANNED && s._id !== selectedSprint?._id,
  );

  const renderMain = () => {
    if (!selectedSprint) {
      return (
        <div className={styles.emptyState}>
          <Empty description="Select a sprint or create one" />
        </div>
      );
    }

    const isCompleted = selectedSprint.status === SprintStatus.COMPLETED;

    return (
      <>
        <div className={styles.sprintHeader}>
          <div className={styles.sprintHeaderTop}>
            <div className={styles.sprintTitle}>{selectedSprint.name}</div>
            {selectedSprint.status === SprintStatus.PLANNED && (
              <Button type="primary" onClick={() => startSprint()} loading={isStarting}>
                Start Sprint
              </Button>
            )}
            {selectedSprint.status === SprintStatus.ACTIVE && (
              <Button danger onClick={() => setCompleteModalOpen(true)}>
                Complete Sprint
              </Button>
            )}
          </div>
          <div className={styles.sprintDates}>
            {new Date(selectedSprint.startDate).toLocaleDateString()} –{" "}
            {new Date(selectedSprint.endDate).toLocaleDateString()}
          </div>

          {!isCompleted &&
            (editingGoal ? (
              <Input.TextArea
                autoFocus
                defaultValue={selectedSprint.goal ?? ""}
                rows={2}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={() => updateGoal(goalDraft)}
              />
            ) : (
              <div
                className={styles.sprintGoal}
                onClick={() => {
                  setGoalDraft(selectedSprint.goal ?? "");
                  setEditingGoal(true);
                }}
                style={{ cursor: "pointer" }}
              >
                {selectedSprint.goal || (
                  <span style={{ color: "#8c8c8c" }}>Click to add a goal…</span>
                )}
              </div>
            ))}

          {selectedSprint.status === SprintStatus.ACTIVE && (
            <Progress percent={progressPct} size="small" style={{ marginTop: 12 }} />
          )}

          {isCompleted && (
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>
                  {selectedSprint.totalPoints ?? 0}
                </div>
                <div className={styles.statLabel}>Total points</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statValue}>
                  {selectedSprint.completedPoints ?? 0}
                </div>
                <div className={styles.statLabel}>Completed</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statValue}>
                  {selectedSprint.totalPoints
                    ? Math.round(
                        ((selectedSprint.completedPoints ?? 0) /
                          selectedSprint.totalPoints) *
                          100,
                      )
                    : 0}
                  %
                </div>
                <div className={styles.statLabel}>Completion</div>
              </div>
            </div>
          )}
        </div>

        {isCompleted && burndown && (
          <div className={styles.sidebarCard} style={{ marginBottom: 16 }}>
            <div className={styles.sidebarTitle}>Burndown</div>
            <BurndownChart days={burndown.days} />
          </div>
        )}

        {!isCompleted && (
          <div style={{ marginBottom: 12 }}>
            <Button icon={<PlusOutlined />} onClick={() => setAddTasksModalOpen(true)}>
              Add tasks from backlog
            </Button>
          </div>
        )}

        <div className={styles.taskList}>
          {sprintTasks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No tasks in this sprint"
            />
          ) : (
            sprintTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={(t) => setSelectedTaskId(t._id)}
              />
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              navigate(`/workspaces/${wsId}/projects/${prId}/board`)
            }
          />
          <span className={styles.projectKey}>{project.key}</span>
          <span className={styles.projectName}>{project.name} — Sprints</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          New Sprint
        </Button>
      </div>

      <div className={styles.page}>
        <div className={styles.main}>{renderMain()}</div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>Sprints</div>
            {sprintsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (sprints ?? []).length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sprints yet" />
            ) : (
              sprints!.map((sprint: Sprint) => (
                <SprintCard
                  key={sprint._id}
                  sprint={sprint}
                  selected={sprint._id === selectedSprintId}
                  onClick={() => setSelectedSprintId(sprint._id)}
                />
              ))
            )}
          </div>

          {velocity && velocity.length > 0 && (
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarTitle}>Velocity</div>
              <VelocityChart data={velocity} />
            </div>
          )}
        </div>
      </div>

      <CreateSprintModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createSprint}
        isPending={isCreating}
      />

      <CompleteSprintModal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        onSubmit={(action, nextSprintId) => completeSprint({ action, nextSprintId })}
        isPending={isCompleting}
        otherPlannedSprints={otherPlannedSprints}
      />

      <AddTasksToSprintModal
        open={addTasksModalOpen}
        onClose={() => setAddTasksModalOpen(false)}
        backlogTasks={backlogTasks}
        onSubmit={addTasksToSprint}
        isPending={isAddingTasks}
      />

      {selectedTask && (
        <TaskDetailModal
          key={selectedTask._id}
          task={selectedTask}
          workspaceId={wsId}
          projectId={prId}
          statuses={project.statuses.map((s) => s.name)}
          open={!!selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
