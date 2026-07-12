import { useEffect } from "react";
import { Modal, Form, Input, DatePicker, Button } from "antd";
import dayjs from "dayjs";
import { CreateSprintDto } from "../services/sprintService";

const { RangePicker } = DatePicker;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateSprintDto) => void;
  isPending: boolean;
}

export default function CreateSprintModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

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
      title="New Sprint"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Form layout="vertical" form={form} onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="name"
          label="Sprint name"
          rules={[{ required: true, message: "Please enter a sprint name" }]}
        >
          <Input placeholder="Sprint 4" />
        </Form.Item>
        <Form.Item name="goal" label="Goal (optional)">
          <Input.TextArea rows={3} placeholder="What is this sprint trying to achieve?" />
        </Form.Item>
        <Form.Item
          name="range"
          label="Sprint dates"
          rules={[{ required: true, message: "Please select start and end dates" }]}
        >
          <RangePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Create
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
