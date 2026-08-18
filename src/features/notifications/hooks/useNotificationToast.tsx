import { useCallback } from "react";
import { App as AntApp } from "antd";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Notification } from "@types/index";
import NotificationToast from "../components/NotificationToast";
import { notificationService } from "../services/notificationService";

// how long the pop-up stays on screen
const TOAST_DURATION_SECONDS = 3;

/**
 * Shows an incoming notification as a card that slides in from the top and
 * disappears on its own. Clicking it opens the related task/sprint and marks
 * the notification read.
 *
 * Uses AntD's `App.useApp()` (not the static `notification.*` API) so the
 * toast inherits the ConfigProvider theme — the static API renders outside
 * the provider and would always be light.
 */
export const useNotificationToast = () => {
  const { notification: api } = AntApp.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useCallback(
    (item: Notification) => {
      api.open({
        // keyed by id — a re-delivered notification replaces its own card
        // instead of stacking a duplicate
        key: item._id,
        // AntD v6 renamed `message` to `title`
        title: (
          <NotificationToast
            notification={item}
            actionLabel={t("notifications.toastAction")}
          />
        ),
        placement: "top",
        duration: TOAST_DURATION_SECONDS,
        showProgress: true,
        pauseOnHover: true,
        onClick: () => {
          api.destroy(item._id);
          if (!item.link) return;

          notificationService
            .markAsRead(item._id)
            .catch(() => undefined)
            .finally(() => {
              qc.invalidateQueries({ queryKey: ["notifications"] });
              qc.invalidateQueries({
                queryKey: ["notifications-unread-count"],
              });
            });

          navigate(item.link);
        },
      });
    },
    [api, navigate, qc, t],
  );
};
