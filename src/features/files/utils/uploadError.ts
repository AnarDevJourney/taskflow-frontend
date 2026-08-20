import { AxiosError } from "axios";

interface ApiErrorBody {
  error?: { message?: string | string[] };
}

/**
 * Pulls the message out of the backend's error envelope
 * (`{ success: false, error: { message } }`), which is sometimes an array of
 * class-validator strings.
 */
export function extractApiError(error: unknown, fallback: string): string {
  const message = (error as AxiosError<ApiErrorBody>)?.response?.data?.error
    ?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
}
