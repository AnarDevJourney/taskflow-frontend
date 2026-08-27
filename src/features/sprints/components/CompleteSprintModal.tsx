import { useState } from "react";
import { Modal, Radio, Select, Button } from "antd";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      title={t("sprintsPage.completeModal.title")}
      open={open}
      onCancel={onClose}
      width={440}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t("sprintsPage.completeModal.cancel")}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isPending}
          disabled={!canSubmit}
          onClick={handleOk}
        >
          {t("sprintsPage.completeModal.complete")}
        </Button>,
      ]}
    >
      <p style={{ color: "#8c8c8c", fontSize: 13, marginBottom: 16 }}>
        {t("sprintsPage.completeModal.question")}
      </p>
      <Radio.Group
        value={action}
        onChange={(e) => setAction(e.target.value)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Radio value={IncompleteTaskAction.MOVE_TO_BACKLOG}>
          {t("sprintsPage.completeModal.moveToBacklog")}
        </Radio>
        <Radio value={IncompleteTaskAction.MOVE_TO_NEXT_SPRINT}>
          {t("sprintsPage.completeModal.moveToNextSprint")}
        </Radio>
      </Radio.Group>
      {action === IncompleteTaskAction.MOVE_TO_NEXT_SPRINT && (
        <Select
          style={{ width: "100%", marginTop: 12 }}
          placeholder={t("sprintsPage.completeModal.selectNextSprint")}
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
