import { useState } from "react";
import { Modal, Radio, Select, Button } from "antd";
import { Sprint } from "@types/index";
import { IncompleteTaskAction } from "../services/sprintService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (action: IncompleteTaskAction, nextSprintId?: string) => void;
  isPending: boolean;
  otherPlannedSprints: Sprint[];
}

export default function CompleteSprintModal({
  open,
  onClose,
  onSubmit,
  isPending,
  otherPlannedSprints,
}: Props) {
  const [action, setAction] = useState<IncompleteTaskAction>(
    IncompleteTaskAction.MOVE_TO_BACKLOG,
  );
  const [nextSprintId, setNextSprintId] = useState<string | undefined>();

  const handleOk = () => {
    onSubmit(action, action === IncompleteTaskAction.MOVE_TO_NEXT_SPRINT ? nextSprintId : undefined);
  };

  const canSubmit =
    action === IncompleteTaskAction.MOVE_TO_BACKLOG || !!nextSprintId;

  return (
    <Modal
      title="Complete Sprint"
      open={open}
      onCancel={onClose}
      width={440}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isPending}
          disabled={!canSubmit}
          onClick={handleOk}
        >
          Complete Sprint
        </Button>,
      ]}
    >
      <p style={{ color: "#8c8c8c", fontSize: 13, marginBottom: 16 }}>
        What should happen to tasks that aren't done yet?
      </p>
      <Radio.Group
        value={action}
        onChange={(e) => setAction(e.target.value)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Radio value={IncompleteTaskAction.MOVE_TO_BACKLOG}>
          Move incomplete tasks to Backlog
        </Radio>
        <Radio value={IncompleteTaskAction.MOVE_TO_NEXT_SPRINT}>
          Move to next sprint
        </Radio>
      </Radio.Group>
      {action === IncompleteTaskAction.MOVE_TO_NEXT_SPRINT && (
        <Select
          style={{ width: "100%", marginTop: 12 }}
          placeholder="Select next sprint"
          value={nextSprintId}
          onChange={setNextSprintId}
          options={otherPlannedSprints.map((s) => ({
            value: s._id,
            label: s.name,
          }))}
        />
      )}
    </Modal>
  );
}
