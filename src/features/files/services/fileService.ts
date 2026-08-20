import type { AxiosProgressEvent } from "axios";
import api from "@lib/axios";
import type { ApiResponse, Attachment } from "@types/index";

export interface UploadAttachmentDto {
  workspaceId: string;
  projectId: string;
  taskId: string;
  file: File;
  /** 0–100, called as the bytes go up the wire. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
}

export interface AvatarResponse {
  avatarUrl: string | null;
}

export interface LogoResponse {
  logoUrl: string | null;
}

// The backend streams the multipart body straight into object storage, which
// means it parses the parts in wire order: the text fields have to be appended
// BEFORE the file or they are not there yet when the upload is validated.
const buildAttachmentForm = (dto: UploadAttachmentDto): FormData => {
  const form = new FormData();
  form.append("workspaceId", dto.workspaceId);
  form.append("projectId", dto.projectId);
  form.append("taskId", dto.taskId);
  form.append("file", dto.file);
  return form;
};

/**
 * Every multipart request must send this.
 *
 * The shared axios instance sets `Content-Type: application/json` as an
 * instance default, and axios's default `transformRequest` reacts to that by
 * running FormData through `formDataToJSON` — a `File` serializes to `{}`, so
 * the server receives a JSON body with no file at all. Nulling the header both
 * skips that conversion and stops axios from sending a Content-Type, which is
 * what lets the browser set `multipart/form-data` with the boundary itself.
 */
const MULTIPART_CONFIG = { headers: { "Content-Type": null } } as const;

const uploadProgressHandler =
  (onProgress?: (percent: number) => void) =>
  (event: AxiosProgressEvent): void => {
    if (!onProgress || !event.total) return;
    onProgress(Math.round((event.loaded / event.total) * 100));
  };

export const fileService = {
  upload: async (dto: UploadAttachmentDto): Promise<Attachment> => {
    const res = await api.post<ApiResponse<Attachment>>(
      "/files/upload",
      buildAttachmentForm(dto),
      {
        ...MULTIPART_CONFIG,
        signal: dto.signal,
        onUploadProgress: uploadProgressHandler(dto.onProgress),
      },
    );
    return res.data.data;
  },

  getSignedUrl: async (
    attachmentId: string,
    download = false,
  ): Promise<SignedUrlResponse> => {
    const res = await api.get<ApiResponse<SignedUrlResponse>>(
      "/files/signed-url",
      { params: { attachmentId, ...(download ? { download: "true" } : {}) } },
    );
    return res.data.data;
  },

  remove: async (attachmentId: string): Promise<void> => {
    await api.delete(`/files/${attachmentId}`);
  },

  uploadAvatar: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<AvatarResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ApiResponse<AvatarResponse>>(
      "/users/me/avatar",
      form,
      { ...MULTIPART_CONFIG, onUploadProgress: uploadProgressHandler(onProgress) },
    );
    return res.data.data;
  },

  removeAvatar: async (): Promise<void> => {
    await api.delete("/users/me/avatar");
  },

  uploadWorkspaceLogo: async (
    workspaceId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<LogoResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ApiResponse<LogoResponse>>(
      `/workspaces/${workspaceId}/logo`,
      form,
      { ...MULTIPART_CONFIG, onUploadProgress: uploadProgressHandler(onProgress) },
    );
    return res.data.data;
  },

  removeWorkspaceLogo: async (workspaceId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/logo`);
  },
};
