import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@lib/theme/ThemeProvider";
import { Theme, THEMES } from "@lib/theme/constants";
import styles from "./SettingsPage.module.css";

const THEME_ICONS: Record<Theme, typeof DesktopOutlined> = {
  system: DesktopOutlined,
  light: SunOutlined,
  dark: MoonOutlined,
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("settingsPage.title")}</h1>

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
