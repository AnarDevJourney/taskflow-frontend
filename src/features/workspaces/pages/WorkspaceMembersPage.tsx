import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Tag,
  Typography,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { workspaceService, InviteMemberDto } from "../services/workspaceService";
import { WorkspaceRole } from "@types/index";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import styles from "./WorkspaceMembersPage.module.css";

const { Text, Paragraph } = Typography;

export default function WorkspaceMembersPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [form] = Form.useForm();

  const ROLE_OPTIONS = [
    { value: WorkspaceRole.ADMIN, label: t("members.role.admin") },
    { value: WorkspaceRole.MEMBER, label: t("members.role.member") },
    { value: WorkspaceRole.VIEWER, label: t("members.role.viewer") },
  ];

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.getMembers(workspaceId ?? ""),
    enabled: !!workspaceId,
  });

  const {
    mutate: invite,
    isPending: isInviting,
    error: inviteError,
    reset: resetInviteError,
  } = useMutation({
    mutationFn: (dto: InviteMemberDto) =>
      workspaceService.inviteMember(workspaceId ?? "", dto),
    onSuccess: ({ token }) => {
      setInviteLink(`${window.location.origin}/register?token=${token}`);
      form.resetFields();
    },
  });

  const { mutate: removeMember } = useMutation({
    mutationFn: (memberId: string) =>
      workspaceService.removeMember(workspaceId ?? "", memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      message.success(t("members.memberRemoved"));
    },
    onError: () => message.error(t("members.removeMemberFailed")),
  });

  const inviteErrorMessage = (() => {
    if (!inviteError) return null;
    const msg = (inviteError as AxiosError<any>)?.response?.data?.error?.message;
    return Array.isArray(msg) ? msg[0] : msg || t("members.sendInviteFailed");
  })();

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteLink(null);
    resetInviteError();
    form.resetFields();
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    message.success(t("members.inviteLinkCopied"));
  };

  const myRole = members?.find(
    (m) => m.userId?._id === currentUser?._id,
  )?.role;
  const canManageMembers =
    myRole === WorkspaceRole.OWNER || myRole === WorkspaceRole.ADMIN;

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>{t("members.title")}</div>
            <div className={styles.sectionDesc}>{t("members.subtitle")}</div>
          </div>
          {canManageMembers && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setInviteModalOpen(true)}
            >
              {t("members.inviteMember")}
            </Button>
          )}
        </div>
        <div className={styles.sectionBody}>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : (
            <div className={styles.memberList}>
              {members
                ?.filter((member) => member.userId)
                .map((member) => (
                  <div key={member.userId._id} className={styles.memberRow}>
                    <Avatar size={32} style={{ background: "#4a6cf7", flexShrink: 0 }}>
                      {member.userId.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{member.userId.name}</div>
                      <div className={styles.memberEmail}>{member.userId.email}</div>
                    </div>
                    <Tag>{t(`members.role.${member.role}`)}</Tag>
                    {canManageMembers && member.role !== WorkspaceRole.OWNER && (
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => removeMember(member.userId._id)}
                      />
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        title={
          inviteLink
            ? t("members.inviteSentTitle")
            : t("members.inviteMemberTitle")
        }
        open={inviteModalOpen}
        onCancel={closeInviteModal}
        footer={null}
        width={480}
      >
        {inviteLink ? (
          <div>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              {t("members.inviteSentBody")}
            </Paragraph>
            <div className={styles.linkRow}>
              <Text code className={styles.linkText}>
                {inviteLink}
              </Text>
              <Button icon={<CopyOutlined />} onClick={copyInviteLink} />
            </div>
            <Button
              type="primary"
              block
              style={{ marginTop: 16 }}
              onClick={closeInviteModal}
            >
              {t("members.done")}
            </Button>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={(values) => invite(values)}
          >
            {inviteErrorMessage && (
              <div className={styles.inviteError}>{inviteErrorMessage}</div>
            )}
            <Form.Item
              name="email"
              label={t("members.emailLabel")}
              rules={[
                { required: true, message: t("members.emailRequired") },
                { type: "email", message: t("members.emailInvalid") },
              ]}
            >
              <Input placeholder={t("members.emailPlaceholder")} autoFocus />
            </Form.Item>
            <Form.Item
              name="role"
              label={t("members.roleLabel")}
              initialValue={WorkspaceRole.MEMBER}
              rules={[{ required: true, message: t("members.roleRequired") }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" loading={isInviting} block>
                {t("members.sendInvite")}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
