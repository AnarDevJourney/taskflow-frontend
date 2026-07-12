import { Select } from "antd";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "@lib/i18n";

const languageLabels: Record<(typeof supportedLanguages)[number], string> = {
  en: "🇬🇧 English",
  ru: "🇷🇺 Русский",
  az: "🇦🇿 Azərbaycan",
};

interface LanguageSwitcherProps {
  size?: "small" | "middle" | "large";
  className?: string;
}

export default function LanguageSwitcher({
  size = "middle",
  className,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  return (
    <Select
      size={size}
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(value) => i18n.changeLanguage(value)}
      options={supportedLanguages.map((lng) => ({
        value: lng,
        label: languageLabels[lng],
      }))}
      className={className}
      popupMatchSelectWidth={false}
    />
  );
}
