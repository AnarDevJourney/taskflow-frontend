import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { DashboardActivity } from "@types/index";
import {
  ACTION_CATEGORY_COLORS,
  getActionCategory,
} from "@features/activity/utils/activityMeta";
import WidgetCard from "./WidgetCard";
import styles from "./RecentActivityWidget.module.css";

dayjs.extend(relativeTime);

interface Props {
  activities: DashboardActivity[];
}

/**
 * A five-row condensation of the workspace Activity Log.
 *
 * Action labels and the action→category color come from that feature's
 * existing `activityMeta` / `activityLogPage.action.*` translations rather
 * than a second copy here — a new `ActivityAction` shows up correctly in both
 * places or neither.
 */
export default function RecentActivityWidget({ activities }: Props) {
  const { t } = useTranslation();

  return (
    <WidgetCard
      title={t("dashboardPage.activity.title")}
      emptyText={t("dashboardPage.activity.empty")}
      isEmpty={activities.length === 0}
    >
      {activities.map((activity) => {
        const category = getActionCategory(activity.action);

        return (
          <li key={activity._id} className={styles.row}>
            <Avatar
              size={32}
              src={activity.actor?.avatarUrl ?? undefined}
              icon={<UserOutlined />}
              className={styles.avatar}
            >
              {activity.actor?.name?.[0]?.toUpperCase()}
            </Avatar>

            <div className={styles.body}>
              <div className={styles.line}>
                <span className={styles.actor}>
                  {activity.actor?.name ?? t("dashboardPage.activity.unknownUser")}
                </span>
                <span className={styles.action}>
                  {/* falls back to the raw action key if a new backend action
                      has no translation yet, rather than rendering blank */}
                  {t(`activityLogPage.action.${activity.action}`, {
                    defaultValue: activity.action,
                  })}
                </span>
              </div>

              <div className={styles.meta}>
                {activity.task && (
                  <span className={styles.target} title={activity.task.title}>
                    {activity.task.title}
                  </span>
                )}
                <span className={styles.time}>
                  {dayjs(activity.createdAt).fromNow()}
                </span>
              </div>
            </div>

            {/* identity dot — the category is also carried by the action text
                beside it, so this never encodes anything on its own */}
            <span
              className={styles.categoryDot}
              style={{ background: ACTION_CATEGORY_COLORS[category] }}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </WidgetCard>
  );
}
