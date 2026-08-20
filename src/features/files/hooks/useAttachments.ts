import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@lib/toast";
import { fileService } from "../services/fileService";
import { extractApiError } from "../utils/uploadError";
import { validateFile } from "../utils/validateFile";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_MB,
} from "../utils/fileMeta";

export interface UploadItem {
  /** Client-side id — the attachment has no server id until it lands. */
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "error";
  error?: string;
}

interface Target {
  workspaceId: string;
  projectId: string;
  taskId: string;
}

/**
 * Owns the upload queue for one task.
 *
 * Files are sent one at a time on purpose: each upload holds an open stream to
 * object storage for its whole duration, and the endpoint is rate-limited, so
 * firing ten parallel requests would be slower and noisier than a queue.
 */
export function useAttachmentUploads(target: Target, onUploaded?: () => void) {
  const { t } = useTranslation();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setUploads((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const enqueue = useCallback(
    (files: File[]) => {
      const accepted: UploadItem[] = [];

      for (const file of files) {
        const rejection = validateFile(
          file,
          ALLOWED_ATTACHMENT_MIME_TYPES,
          MAX_ATTACHMENT_MB,
        );

        if (rejection) {
          toast.error(
            rejection.reason === "type"
              ? t("attachments.errorType", { name: file.name })
              : t("attachments.errorSize", {
                  name: file.name,
                  max: rejection.maxMb,
                }),
          );
          continue;
        }

        accepted.push({
          id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          progress: 0,
          status: "uploading",
        });
      }

      if (!accepted.length) return;
      setUploads((prev) => [...prev, ...accepted]);

      // chain onto the existing queue so uploads stay strictly sequential
      queueRef.current = accepted.reduce(
        (chain, item) =>
          chain.then(async () => {
            try {
              await fileService.upload({
                ...target,
                file: item.file,
                onProgress: (progress) => patch(item.id, { progress }),
              });
              dismiss(item.id);
              onUploaded?.();
            } catch (error) {
              patch(item.id, {
                status: "error",
                error: extractApiError(error, t("attachments.uploadFailed")),
              });
            }
          }),
        queueRef.current,
      );
    },
    [target, patch, dismiss, onUploaded, t],
  );

  return { uploads, enqueue, dismiss };
}

/** Resolves a presigned URL, then opens it (new tab) or downloads it. */
export function useOpenAttachment() {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = useCallback(
    async (attachmentId: string, download: boolean) => {
      setBusyId(attachmentId);
      try {
        const { url } = await fileService.getSignedUrl(attachmentId, download);
        // The URL points straight at object storage — the API is not in the
        // download path at all, it only signs the link.
        if (download) {
          const link = document.createElement("a");
          link.href = url;
          link.rel = "noopener";
          link.click();
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        toast.error(extractApiError(error, t("attachments.openFailed")));
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return { open, busyId };
}

export function useDeleteAttachment(onChanged: () => void) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (attachmentId: string) => fileService.remove(attachmentId),
    onSuccess: () => {
      onChanged();
      toast.success(t("attachments.deleted"));
    },
    onError: (error) =>
      toast.error(extractApiError(error, t("attachments.deleteFailed"))),
  });
}
