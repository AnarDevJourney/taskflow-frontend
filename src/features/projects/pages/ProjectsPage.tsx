import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Form, Input, Modal, Skeleton, Empty, Tooltip } from "antd";
import { PlusOutlined, ProjectOutlined, TeamOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "../hooks/useProjects";
import { projectService, CreateProjectDto } from "../services/projectService";
import styles from "./ProjectsPage.module.css";

export default function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: projects, isLoading } = useProjects(workspaceId ?? "");

  const { mutate: createProject, isPending } = useMutation({
    mutationFn: (dto: CreateProjectDto) =>
      projectService.create(workspaceId ?? "", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      setModalOpen(false);
      form.resetFields();
    },
  });

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 8,
                padding: 20,
              }}
            >
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No projects yet"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Create your first project
            </Button>
          </Empty>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects?.map((project) => (
            <Link
              key={project._id}
              to={`/workspaces/${workspaceId}/projects/${project._id}/board`}
              className={styles.card}
            >
              <div className={styles.cardTop}>
                <div
                  className={styles.colorDot}
                  style={{ background: project.color || "#4a6cf7" }}
                />
                <span className={styles.cardKey}>{project.key}</span>
                {project.sprintMode && (
                  <span className={styles.sprintBadge}>Sprint mode</span>
                )}
              </div>

              <div className={styles.cardName}>{project.name}</div>
              <div className={styles.cardDesc}>
                {project.description || "No description"}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.cardMeta}>
                  <Tooltip title="Tasks">
                    <span className={styles.metaItem}>
                      <ProjectOutlined />
                      {project.taskCounter}
                    </span>
                  </Tooltip>
                  <Tooltip title="Members">
                    <span className={styles.metaItem}>
                      <TeamOutlined />
                      {project.members?.length ?? 0}
                    </span>
                  </Tooltip>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal
        title="New Project"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={480}
      >
        <div className={styles.modal}>
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => createProject(values)}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="name"
              label="Project name"
              rules={[
                { required: true, message: "Please enter a project name" },
              ]}
            >
              <Input placeholder="e.g. Mobile App" />
            </Form.Item>

            <Form.Item
              name="key"
              label="Project key"
              rules={[
                { required: true, message: "Please enter a project key" },
                { max: 6, message: "Key must be 6 characters or less" },
                {
                  pattern: /^[A-Z0-9]+$/,
                  message: "Key must be uppercase letters and numbers only",
                },
              ]}
              extra="Short prefix for task IDs e.g. APP → APP-1, APP-2"
            >
              <Input
                placeholder="APP"
                style={{ textTransform: "uppercase" }}
                onChange={(e) =>
                  form.setFieldValue("key", e.target.value.toUpperCase())
                }
              />
            </Form.Item>

            <Form.Item name="description" label="Description (optional)">
              <Input.TextArea
                placeholder="What is this project about?"
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <Button
                  onClick={() => {
                    setModalOpen(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={isPending}>
                  Create Project
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
}
