import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "@lib/theme/ThemeProvider";
import { Theme, THEMES } from "@lib/theme/constants";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import ImageUploadField from "@features/files/components/ImageUploadField";
import { fileService } from "@features/files/services/fileService";
import styles from "./SettingsPage.module.css";

const THEME_ICONS: Record<Theme, typeof DesktopOutlined> = {
  system: DesktopOutlined,
  light: SunOutlined,
  dark: MoonOutlined,
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  // `useCurrentUser` is cached with staleTime: Infinity, so the avatar only
  // refreshes if the ["me"] query is invalidated explicitly after each change.
  const refreshUser = () => qc.invalidateQueries({ queryKey: ["me"] });

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("settingsPage.title")}</h1>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>
          {t("settingsPage.profile.title")}
        </h2>
        <p className={styles.sectionSubtitle}>
          {t("settingsPage.profile.subtitle")}
        </p>

        <ImageUploadField
          value={user?.avatarUrl ?? null}
          fallbackLetter={user?.name?.[0]}
          label={t("settingsPage.profile.uploadLabel")}
          upload={async (file, onProgress) => {
            await fileService.uploadAvatar(file, onProgress);
            await refreshUser();
          }}
          remove={async () => {
            await fileService.removeAvatar();
            await refreshUser();
          }}
        />
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>{t("settingsPage.appearance.title")}</h2>
        <p className={styles.sectionSubtitle}>{t("settingsPage.appearance.subtitle")}</p>

        <div className={styles.optionGrid}>
          {THEMES.map((option) => {
            const Icon = THEME_ICONS[option];
            const selected = option === theme;
            return (
              <button
                key={option}
                className={`${styles.option} ${selected ? styles.optionSelected : ""}`}
                onClick={() => setTheme(option)}
              >
                <Icon className={styles.optionIcon} />
                <span className={styles.optionLabel}>{t(`settingsPage.appearance.${option}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
