import { useEffect } from "react";
import { Form, Input, Select, Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { Priority } from "@types/index";
import { CreateTaskDto } from "../services/taskService";

interface Props {
  open: boolean;
  defaultStatus: string;
  statuses: string[];
  onSubmit: (dto: CreateTaskDto) => void;
  onClose: () => void;
  isPending: boolean;
}

export default function CreateTaskModal({
  open,
  defaultStatus,
  statuses,
  onSubmit,
  onClose,
  isPending,
}: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldValue("status", defaultStatus);
    }
  }, [open, defaultStatus, form]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={t("createTaskModal.title")}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={520}
    >
      <div style={{ padding: "8px 0" }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => onSubmit(values)}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="title"
            label={t("createTaskModal.titleLabel")}
            rules={[
              { required: true, message: t("createTaskModal.titleRequired") },
            ]}
          >
            <Input
              placeholder={t("createTaskModal.titlePlaceholder")}
              autoFocus
            />
          </Form.Item>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Form.Item name="status" label={t("createTaskModal.statusLabel")}>
              <Select>
                {statuses.map((s) => (
                  <Select.Option key={s} value={s}>
                    {s}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="priority"
              label={t("createTaskModal.priorityLabel")}
              initialValue={Priority.MEDIUM}
            >
              <Select>
                <Select.Option value={Priority.CRITICAL}>
                  {t("createTaskModal.priorityCritical")}
                </Select.Option>
                <Select.Option value={Priority.HIGH}>
                  {t("createTaskModal.priorityHigh")}
                </Select.Option>
                <Select.Option value={Priority.MEDIUM}>
                  {t("createTaskModal.priorityMedium")}
                </Select.Option>
                <Select.Option value={Priority.LOW}>
                  {t("createTaskModal.priorityLow")}
                </Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label={t("createTaskModal.descriptionLabel")}
          >
            <Input.TextArea
              rows={3}
              placeholder={t("createTaskModal.descriptionPlaceholder")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <Button onClick={handleClose}>
                {t("createTaskModal.cancel")}
              </Button>
              <Button type="primary" htmlType="submit" loading={isPending}>
                {t("createTaskModal.createTask")}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
