import { useEffect } from "react";
import { Form, Input, Select, Button, Modal } from "antd";
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
      title="New Task"
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
            label="Task title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="e.g. Fix login bug" autoFocus />
          </Form.Item>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Form.Item name="status" label="Status">
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
              label="Priority"
              initialValue={Priority.MEDIUM}
            >
              <Select>
                <Select.Option value={Priority.CRITICAL}>
                  🔴 Critical
                </Select.Option>
                <Select.Option value={Priority.HIGH}>🟠 High</Select.Option>
                <Select.Option value={Priority.MEDIUM}>🔵 Medium</Select.Option>
                <Select.Option value={Priority.LOW}>⚪ Low</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={3} placeholder="Add more details…" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={isPending}>
                Create Task
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
