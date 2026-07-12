import { Sprint, SprintStatus } from "@types/index";
import dayjs from "dayjs";
import styles from "./SprintCard.module.css";

interface Props {
  sprint: Sprint;
  selected: boolean;
  onClick: () => void;
}

const statusStyles: Record<SprintStatus, { bg: string; color: string; label: string }> = {
  [SprintStatus.PLANNED]: { bg: "#f5f5f5", color: "#8c8c8c", label: "Planned" },
  [SprintStatus.ACTIVE]: { bg: "#f0f4ff", color: "#4a6cf7", label: "Active" },
  [SprintStatus.COMPLETED]: { bg: "#f6ffed", color: "#52c41a", label: "Completed" },
};

export default function SprintCard({ sprint, selected, onClick }: Props) {
  const badge = statusStyles[sprint.status];

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    >
      <div className={styles.header}>
        <span className={styles.name}>{sprint.name}</span>
        <span
          className={styles.badge}
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>
      <div className={styles.dates}>
        {dayjs(sprint.startDate).format("MMM D")} –{" "}
        {dayjs(sprint.endDate).format("MMM D, YYYY")}
      </div>
      {sprint.status === SprintStatus.COMPLETED && (
        <div className={styles.points}>
          {sprint.completedPoints ?? 0}/{sprint.totalPoints ?? 0} points
        </div>
      )}
    </div>
  );
}
