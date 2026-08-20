import { useState } from "react";
import { Avatar, Button, Progress } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { toast } from "@lib/toast";
import FileDropZone from "./FileDropZone";
import { extractApiError } from "../utils/uploadError";
import { validateFile } from "../utils/validateFile";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_MB,
  toAcceptAttribute,
} from "../utils/fileMeta";
import styles from "./ImageUploadField.module.css";

interface Props {
  /** Current image URL, or null when nothing is set. */
  value: string | null;
  /** Letter shown in the placeholder circle when there is no image. */
  fallbackLetter?: string;
  shape?: "circle" | "square";
  size?: number;
  disabled?: boolean;
  upload: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  remove: () => Promise<void>;
  label: string;
  hint?: string;
}

/**
 * Avatar / workspace-logo picker. Both targets behave identically — same image
 * MIME rules, same size ceiling, one image that replaces the previous one — so
 * they share this component and only differ in which service calls are passed in.
 */
export default function ImageUploadField({
  value,
  fallbackLetter,
  shape = "circle",
  size = 72,
  disabled = false,
  upload,
  remove,
  label,
  hint,
}: Props) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  const busy = progress !== null || removing;

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const rejection = validateFile(file, ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_MB);
    if (rejection) {
      toast.error(
        rejection.reason === "type"
          ? t("imageUpload.errorType")
          : t("imageUpload.errorSize", { max: rejection.maxMb }),
      );
      return;
    }

    setProgress(0);
    try {
      await upload(file, setProgress);
      toast.success(t("imageUpload.uploaded"));
    } catch (error) {
      toast.error(extractApiError(error, t("imageUpload.uploadFailed")));
    } finally {
      setProgress(null);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await remove();
      toast.success(t("imageUpload.removed"));
    } catch (error) {
      toast.error(extractApiError(error, t("imageUpload.removeFailed")));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={styles.row}>
      <Avatar
        shape={shape}
        size={size}
        src={value ?? undefined}
        className={styles.preview}
      >
        {fallbackLetter?.toUpperCase()}
      </Avatar>

      <div className={styles.controls}>
        <FileDropZone
          accept={toAcceptAttribute(ALLOWED_IMAGE_MIME_TYPES)}
          disabled={disabled || busy}
          onFiles={(files) => void handleFiles(files)}
          label={label}
          hint={hint ?? t("imageUpload.hint", { max: MAX_IMAGE_MB })}
        >
          <span className={styles.zoneInner}>
            <UploadOutlined className={styles.zoneIcon} />
            <span className={styles.zoneLabel}>{label}</span>
            <span className={styles.zoneHint}>
              {hint ?? t("imageUpload.hint", { max: MAX_IMAGE_MB })}
            </span>
          </span>
        </FileDropZone>

        {progress !== null && (
          <Progress percent={progress} size="small" strokeColor="#4a6cf7" />
        )}

        {value && (
          <Button
            size="small"
            danger
            type="text"
            icon={<DeleteOutlined />}
            loading={removing}
            disabled={disabled || progress !== null}
            onClick={() => void handleRemove()}
            className={styles.removeBtn}
          >
            {t("imageUpload.remove")}
          </Button>
        )}
      </div>
    </div>
  );
}
