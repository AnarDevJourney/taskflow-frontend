import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Task, StatusConfig } from "@types/index";
import TaskCard from "./TaskCard";
import styles from "./BoardColumn.module.css";

interface Props {
  status: StatusConfig;
  tasks: Task[];
  onAddTask: (status: string) => void;
  onTaskClick: (task: Task) => void;
}

export default function BoardColumn({
  status,
  tasks,
  onAddTask,
  onTaskClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.name });

  const isOverLimit = status.wipLimit != null && tasks.length > status.wipLimit;

  return (
    <div className={styles.column}>
      {/* Column header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span
            className={styles.colorDot}
            style={{ background: status.color }}
          />
          <span className={styles.name}>{status.name}</span>
          <span
            className={styles.count}
            style={
              isOverLimit
                ? {
                    color: "#f5222d",
                    background: "#fff1f0",
                    borderColor: "#ffa39e",
                  }
                : {}
            }
          >
            {tasks.length}
            {status.wipLimit != null && `/${status.wipLimit}`}
          </span>
        </div>
        <Tooltip title="Add task">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onAddTask(status.name)}
            className={styles.addBtn}
          />
        </Tooltip>
      </div>

      {/* Droppable task list */}
      <SortableContext
        items={tasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={styles.taskList}
          style={{
            background: isOver ? "#f0f4ff" : undefined,
            transition: "background 0.15s",
          }}
        >
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={onTaskClick} />
          ))}

          {tasks.length === 0 && (
            <div className={styles.empty}>Drop tasks here</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
