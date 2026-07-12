import { useState, useEffect } from "react";
import { Modal, Checkbox, Button, Empty } from "antd";
import { Task } from "@types/index";

interface Props {
  open: boolean;
  onClose: () => void;
  backlogTasks: Task[];
  onSubmit: (taskIds: string[]) => void;
  isPending: boolean;
}

export default function AddTasksToSprintModal({
  open,
  onClose,
  backlogTasks,
  onSubmit,
  isPending,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const toggle = (taskId: string) => {
    setSelected((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  return (
    <Modal
      title="Add tasks from backlog"
      open={open}
      onCancel={onClose}
      width={480}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isPending}
          disabled={selected.length === 0}
          onClick={() => onSubmit(selected)}
        >
          Add {selected.length > 0 ? `(${selected.length})` : ""}
        </Button>,
      ]}
    >
      {backlogTasks.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No backlog tasks" />
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {backlogTasks.map((task) => (
            <div
              key={task._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 4px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
              }}
              onClick={() => toggle(task._id)}
            >
              <Checkbox checked={selected.includes(task._id)} onChange={() => toggle(task._id)} />
              <span style={{ fontSize: 11, color: "#8c8c8c" }}>#{task.taskNumber}</span>
              <span style={{ fontSize: 13, color: "#1a1f2e" }}>{task.title}</span>
              {task.storyPoints != null && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "#8c8c8c",
                    background: "#f5f5f5",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {task.storyPoints}p
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
