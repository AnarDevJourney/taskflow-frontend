export type FileRejectionReason = "type" | "size";

export interface FileRejection {
  reason: FileRejectionReason;
  maxMb: number;
}

/**
 * Client-side pre-check so an obviously invalid file never becomes a request.
 * The backend enforces the same two rules independently — this only saves the
 * user a round trip, it is not the security boundary.
 */
export function validateFile(
  file: File,
  allowedMimeTypes: readonly string[],
  maxMb: number,
): FileRejection | null {
  if (!allowedMimeTypes.includes(file.type)) return { reason: "type", maxMb };
  if (file.size > maxMb * 1024 * 1024) return { reason: "size", maxMb };
  return null;
}
