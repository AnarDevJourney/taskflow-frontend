import {
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
  FileOutlined,
} from "@ant-design/icons";
import type { ComponentType } from "react";

// Mirrors the backend's ALLOWED_MIME_TYPES (common/upload/upload.constants.ts).
// Kept in sync by hand — the browser rejects the file before the request so the
// user gets instant feedback, but the backend remains the real gatekeeper.
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
] as const;

/** Avatars and workspace logos — images only, no animated GIFs. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// Must match MAX_UPLOAD_MB / MAX_IMAGE_UPLOAD_MB on the backend.
export const MAX_ATTACHMENT_MB = 100;
export const MAX_IMAGE_MB = 5;

/** `accept` attribute value for a file input, from a MIME list. */
export const toAcceptAttribute = (mimeTypes: readonly string[]): string =>
  mimeTypes.join(",");

export const isImageMimeType = (mimeType: string): boolean =>
  mimeType.startsWith("image/");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const ICON_BY_MIME: Record<string, ComponentType> = {
  "application/pdf": FilePdfOutlined,
  "application/msword": FileWordOutlined,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileWordOutlined,
  "application/vnd.ms-excel": FileExcelOutlined,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileExcelOutlined,
  "text/plain": FileTextOutlined,
  "text/csv": FileExcelOutlined,
  "application/zip": FileZipOutlined,
};

const COLOR_BY_MIME: Record<string, string> = {
  "application/pdf": "#e5484d",
  "application/msword": "#2b6cb0",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "#2b6cb0",
  "application/vnd.ms-excel": "#207245",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "#207245",
  "text/csv": "#207245",
  "text/plain": "#6b7280",
  "application/zip": "#b45309",
};

export const getFileIcon = (mimeType: string): ComponentType =>
  isImageMimeType(mimeType)
    ? FileImageOutlined
    : (ICON_BY_MIME[mimeType] ?? FileOutlined);

export const getFileColor = (mimeType: string): string =>
  isImageMimeType(mimeType) ? "#7c3aed" : (COLOR_BY_MIME[mimeType] ?? "#6b7280");
