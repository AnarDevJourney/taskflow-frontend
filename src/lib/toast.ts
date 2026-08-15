import { toast as toastify, ToastOptions } from "react-toastify";

const baseOptions: ToastOptions = {
  position: "top-right",
};

export const toast = {
  success: (msg: string, options?: ToastOptions) =>
    toastify.success(msg, { ...baseOptions, ...options }),
  error: (msg: string, options?: ToastOptions) =>
    toastify.error(msg, { ...baseOptions, ...options }),
};
