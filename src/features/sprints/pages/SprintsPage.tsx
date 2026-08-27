import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Empty, Skeleton, Progress } from "antd";
import { useTranslation } from "react-i18next";
import { toast } from "@lib/toast";
import { PlusOutlined, ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const wsId = workspaceId ?? "";
  const prId = projectId ?? "";

  const { data: project } = useProject(wsId, prId);
  const { data: sprints, isLoading: sprintsLoading } = useSprints(wsId, prId);
  const { data: tasksData } = useTasks(wsId, prId);
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);

  // Seeded once from a `?sprintId=` deep link (e.g. the dashboard's sprint
  // progress card) — same lazy-`useState`-initializer pattern the board uses
  // for `?priority=`/`?assignee=`, not two-way synced back to the URL, so
  // picking a different sprint afterwards doesn't rewrite the address bar.
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(
    () => searchParams.get("sprintId"),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [addTasksModalOpen, setAddTasksModalOpen] = useState(false);

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
    onError: () => toast.error(t("sprintsPage.toasts.createError")),
  });

  const { mutate: updateSprint, isPending: isUpdating } = useMutation({
    mutationFn: (dto: CreateSprintDto) =>
      sprintService.update(wsId, prId, selectedSprint!._id, dto),
    onSuccess: () => {
      invalidateAll();
      setEditModalOpen(false);
    },
    onError: () => toast.error(t("sprintsPage.toasts.updateSprintError")),
  });

  const { mutate: startSprint, isPending: isStarting } = useMutation({
    mutationFn: () => sprintService.start(wsId, prId, selectedSprint!._id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t("sprintsPage.toasts.sprintStarted"));
    },
    onError: () => toast.error(t("sprintsPage.toasts.startError")),
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
      toast.success(t("sprintsPage.toasts.sprintCompleted"));
    },
    onError: () => toast.error(t("sprintsPage.toasts.completeError")),
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
      toast.success(t("sprintsPage.toasts.tasksAdded"));
    },
    onError: () => toast.error(t("sprintsPage.toasts.addTasksError")),
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
          <Empty description={t("sprintsPage.selectOrCreate")} />
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
              <div className={styles.headerActions}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditModalOpen(true)}
                  title={t("sprintsPage.editSprint")}
                />
                <Button type="primary" onClick={() => startSprint()} loading={isStarting}>
                  {t("sprintsPage.startSprint")}
                </Button>
              </div>
            )}
            {selectedSprint.status === SprintStatus.ACTIVE && (
              <Button danger onClick={() => setCompleteModalOpen(true)}>
                {t("sprintsPage.completeSprint")}
              </Button>
            )}
          </div>
          <div className={styles.sprintDates}>
            {new Date(selectedSprint.startDate).toLocaleDateString()} –{" "}
            {new Date(selectedSprint.endDate).toLocaleDateString()}
          </div>

          {!isCompleted && selectedSprint.goal && (
            <div className={styles.sprintGoal}>{selectedSprint.goal}</div>
          )}

          {selectedSprint.status === SprintStatus.ACTIVE && (
            <Progress percent={progressPct} size="small" style={{ marginTop: 12 }} />
          )}

          {isCompleted && (
            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>
                  {selectedSprint.totalPoints ?? 0}
                </div>
                <div className={styles.statLabel}>{t("sprintsPage.totalPoints")}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statValue}>
                  {selectedSprint.completedPoints ?? 0}
                </div>
                <div className={styles.statLabel}>{t("sprintsPage.completed")}</div>
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
                <div className={styles.statLabel}>{t("sprintsPage.completion")}</div>
              </div>
            </div>
          )}
        </div>

        {isCompleted && burndown && (
          <div className={styles.sidebarCard} style={{ marginBottom: 16 }}>
            <div className={styles.sidebarTitle}>{t("sprintsPage.burndown")}</div>
            <BurndownChart days={burndown.days} />
          </div>
        )}

        {!isCompleted && (
          <div style={{ marginBottom: 12 }}>
            <Button icon={<PlusOutlined />} onClick={() => setAddTasksModalOpen(true)}>
              {t("sprintsPage.addTasksFromBacklog")}
            </Button>
          </div>
        )}

        <div className={styles.taskList}>
          {sprintTasks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("sprintsPage.noTasksInSprint")}
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
          <span className={styles.projectName}>
            {project.name} — {t("sprintsPage.title")}
          </span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          {t("sprintsPage.newSprint")}
        </Button>
      </div>

      <div className={styles.page}>
        <div className={styles.main}>{renderMain()}</div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>{t("sprintsPage.sidebarTitle")}</div>
            {sprintsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (sprints ?? []).length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("sprintsPage.noSprintsYet")}
              />
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
              <div className={styles.sidebarTitle}>{t("sprintsPage.velocity")}</div>
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

      <CreateSprintModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={updateSprint}
        isPending={isUpdating}
        sprint={selectedSprint}
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
