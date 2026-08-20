import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal, Progress, Tooltip } from "antd";
import {
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import type { Attachment } from "@types/index";
import FileDropZone from "./FileDropZone";
import {
  useAttachmentUploads,
  useDeleteAttachment,
  useOpenAttachment,
} from "../hooks/useAttachments";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_MB,
  formatBytes,
  getFileColor,
  getFileIcon,
  isImageMimeType,
  toAcceptAttribute,
} from "../utils/fileMeta";
import styles from "./TaskAttachments.module.css";

interface Props {
  attachments: Attachment[];
  workspaceId: string;
  projectId: string;
  taskId: string;
  /** Called after every add or delete so the caller can refetch the task. */
  onChanged: () => void;
  /** Ids of users allowed to delete — the uploader; admins are checked server-side. */
  currentUserId?: string;
}

export default function TaskAttachments({
  attachments,
  workspaceId,
  projectId,
  taskId,
  onChanged,
  currentUserId,
}: Props) {
  const { t } = useTranslation();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Held in a ref so a caller passing an inline arrow does not re-create the
  // upload queue on every render.
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  // Each finished upload refetches the task so the new attachment appears with
  // its real server id, which is what the download and delete calls need.
  const notifyChanged = useCallback(() => onChangedRef.current(), []);

  const { uploads, enqueue, dismiss } = useAttachmentUploads(
    { workspaceId, projectId, taskId },
    notifyChanged,
  );
  const { open, busyId } = useOpenAttachment();
  const { mutate: removeAttachment, isPending: isDeleting } =
    useDeleteAttachment(notifyChanged);

  const confirmTarget = attachments.find((a) => a.id === confirmId) ?? null;

  return (
    <div className={styles.wrapper}>
      {attachments.length > 0 && (
        <div className={styles.list}>
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mimeType);
            const canDelete =
              !currentUserId || attachment.uploadedBy === currentUserId;

            return (
              <div key={attachment.id} className={styles.item}>
                <span
                  className={styles.itemIcon}
                  style={{ color: getFileColor(attachment.mimeType) }}
                >
                  <Icon />
                </span>

                <div className={styles.itemBody}>
                  <div className={styles.itemName} title={attachment.filename}>
                    {attachment.filename}
                  </div>
                  <div className={styles.itemMeta}>
                    {formatBytes(attachment.size)} ·{" "}
                    {dayjs(attachment.uploadedAt).format("DD MMM YYYY")}
                  </div>
                </div>

                <div className={styles.itemActions}>
                  {isImageMimeType(attachment.mimeType) && (
                    <Tooltip title={t("attachments.preview")}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        loading={busyId === attachment.id}
                        onClick={() => void open(attachment.id, false)}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title={t("attachments.download")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={busyId === attachment.id}
                      onClick={() => void open(attachment.id, true)}
                    />
                  </Tooltip>
                  {canDelete && (
                    <Tooltip title={t("attachments.delete")}>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setConfirmId(attachment.id)}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uploads.length > 0 && (
        <div className={styles.list}>
          {uploads.map((upload) => (
            <div key={upload.id} className={styles.item}>
              <div className={styles.itemBody}>
                <div className={styles.itemName} title={upload.file.name}>
                  {upload.file.name}
                </div>
                {upload.status === "error" ? (
                  <div className={styles.itemError}>{upload.error}</div>
                ) : (
                  <Progress
                    percent={upload.progress}
                    size="small"
                    strokeColor="#4a6cf7"
                  />
                )}
              </div>
              {upload.status === "error" && (
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => dismiss(upload.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <FileDropZone
        accept={toAcceptAttribute(ALLOWED_ATTACHMENT_MIME_TYPES)}
        multiple
        onFiles={enqueue}
        label={t("attachments.dropLabel")}
        hint={t("attachments.dropHint", { max: MAX_ATTACHMENT_MB })}
      />

      <Modal
        title={t("attachments.deleteConfirmTitle")}
        open={!!confirmTarget}
        onCancel={() => setConfirmId(null)}
        footer={null}
        width={420}
      >
        <p className={styles.confirmText}>
          {t("attachments.deleteConfirmDesc", {
            name: confirmTarget?.filename ?? "",
          })}
        </p>
        <div className={styles.confirmActions}>
          <Button onClick={() => setConfirmId(null)}>
            {t("attachments.cancel")}
          </Button>
          <Button
            danger
            type="primary"
            loading={isDeleting}
            onClick={() =>
              confirmTarget &&
              removeAttachment(confirmTarget.id, {
                onSuccess: () => setConfirmId(null),
              })
            }
          >
            {t("attachments.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
