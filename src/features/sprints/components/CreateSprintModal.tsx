import { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Sprint } from "@types/index";
import { CreateSprintDto } from "../services/sprintService";

const { RangePicker } = DatePicker;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateSprintDto) => void;
  isPending: boolean;
  sprint?: Sprint | null;
}

export default function CreateSprintModal({
  open,
  onClose,
  onSubmit,
  isPending,
  sprint,
}: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const isEdit = !!sprint;

  useEffect(() => {
    if (!open) return;
    if (sprint) {
      form.setFieldsValue({
        name: sprint.name,
        goal: sprint.goal ?? "",
        range: [dayjs(sprint.startDate), dayjs(sprint.endDate)],
      });
    } else {
      form.resetFields();
    }
  }, [open, sprint, form]);

  const handleFinish = (values: {
    name: string;
    goal?: string;
    range: [dayjs.Dayjs, dayjs.Dayjs];
  }) => {
    onSubmit({
      name: values.name,
      goal: values.goal,
      startDate: values.range[0].toISOString(),
      endDate: values.range[1].toISOString(),
    });
  };

  return (
    <Modal
      title={
        isEdit
          ? t("sprintsPage.createModal.editTitle")
          : t("sprintsPage.createModal.title")
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Form layout="vertical" form={form} onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="name"
          label={t("sprintsPage.createModal.nameLabel")}
          rules={[{ required: true, message: t("sprintsPage.createModal.nameRequired") }]}
        >
          <Input placeholder="Sprint 4" />
        </Form.Item>
        <Form.Item name="goal" label={t("sprintsPage.createModal.goalLabel")}>
          <Input.TextArea
            rows={3}
            placeholder={t("sprintsPage.createModal.goalPlaceholder")}
          />
        </Form.Item>
        <Form.Item
          name="range"
          label={t("sprintsPage.createModal.datesLabel")}
          rules={[{ required: true, message: t("sprintsPage.createModal.datesRequired") }]}
        >
          <RangePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            {t("sprintsPage.createModal.cancel")}
          </Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            {isEdit
              ? t("sprintsPage.createModal.save")
              : t("sprintsPage.createModal.create")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
