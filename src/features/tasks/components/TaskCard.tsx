import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Tag, Tooltip } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Task, Priority } from "@types/index";
import dayjs from "dayjs";
import styles from "./TaskCard.module.css";

interface Props {
  task: Task;
  onClick: (task: Task) => void;
}

const priorityColors: Record<Priority, string> = {
  [Priority.CRITICAL]: "#f5222d",
  [Priority.HIGH]: "#fa8c16",
  [Priority.MEDIUM]: "#4a6cf7",
  [Priority.LOW]: "#8c8c8c",
};

export default function TaskCard({ task, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.card}
      onClick={() => onClick(task)}
    >
      {/* Task key + priority dot */}
      <div className={styles.cardHeader}>
        <span className={styles.taskKey}>
          <span
            className={styles.priorityDot}
            style={{ background: priorityColors[task.priority] }}
          />
        </span>
        <span className={styles.taskId}>#{task.taskNumber}</span>
      </div>

      {/* Title */}
      <div className={styles.title}>{task.title}</div>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className={styles.labels}>
          {task.labels.slice(0, 3).map((label) => (
            <Tag
              key={label}
              style={{ fontSize: 11, padding: "0 6px", margin: "0 4px 0 0" }}
            >
              {label}
            </Tag>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {task.dueDate && (
            <Tooltip title={dayjs(task.dueDate).format("MMM D, YYYY")}>
              <span
                className={styles.dueDate}
                style={{ color: isOverdue ? "#f5222d" : "#8c8c8c" }}
              >
                <CalendarOutlined style={{ marginRight: 3 }} />
                {dayjs(task.dueDate).format("MMM D")}
              </span>
            </Tooltip>
          )}
          {task.storyPoints != null && (
            <span className={styles.points}>{task.storyPoints}p</span>
          )}
        </div>

        {task.assigneeId && (
          <Tooltip title={task.assigneeId.name}>
            <Avatar
              size={22}
              style={{ background: "#4a6cf7", fontSize: 10 }}
              icon={<UserOutlined />}
            >
              {task.assigneeId.name?.[0]?.toUpperCase()}
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
