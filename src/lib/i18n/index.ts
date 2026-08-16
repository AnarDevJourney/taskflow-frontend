import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import "dayjs/locale/az";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import az from "./locales/az.json";

export const supportedLanguages = ["en", "ru", "az"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// dayjs.locale("en") is the built-in default — no import needed for it.
const syncDayjsLocale = (lng: string) => {
  dayjs.locale(supportedLanguages.includes(lng as SupportedLanguage) ? lng : "en");
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      az: { translation: az },
    },
    fallbackLng: "en",
    supportedLngs: supportedLanguages,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "taskflow_language",
    },
  });

// Keep dayjs's relative-time / date formatting (e.g. "6 minutes ago" in
// TaskDetailModal comments) in sync with the app language — both on init
// and on every language switch.
syncDayjsLocale(i18n.language);
i18n.on("languageChanged", syncDayjsLocale);

export default i18n;
