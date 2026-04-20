import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { de } from "@/locales/de";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";
import { ja } from "@/locales/ja_JP";
import { ko } from "@/locales/ko";
import { zhCn } from "@/locales/zhHans";
import { zhTw } from "@/locales/zhHant";

export const LANGUAGE_STORAGE_KEY = "inscribe.language";

export const LANGUAGE_OPTIONS = [
  { label: "English", shortLabel: "EN", value: "en" },
  { label: "简体中文", shortLabel: "简", value: "zh-CN" },
  { label: "繁體中文", shortLabel: "繁", value: "zh-TW" },
  { label: "日本語", shortLabel: "日", value: "ja" },
  { label: "Français", shortLabel: "FR", value: "fr" },
  { label: "한국어", shortLabel: "한", value: "ko" },
  { label: "Deutsch", shortLabel: "DE", value: "de" },
] as const;

export type AppLanguage = (typeof LANGUAGE_OPTIONS)[number]["value"];

const LEGACY_LANGUAGE_MAP: Record<string, AppLanguage> = {
  de_DE: "de",
  en_US: "en",
  fr_FR: "fr",
  ja_JP: "ja",
  ko_KR: "ko",
  zhHans: "zh-CN",
  zh_Hans: "zh-CN",
  zh_Hant: "zh-TW",
  zh_TW: "zh-TW",
};

export function normalizeLanguageCode(value?: string | null): AppLanguage {
  if (!value) {
    return "zh-CN";
  }

  if (value in LEGACY_LANGUAGE_MAP) {
    return LEGACY_LANGUAGE_MAP[value];
  }

  return LANGUAGE_OPTIONS.some((option) => option.value === value)
    ? (value as AppLanguage)
    : "zh-CN";
}

export const DEFAULT_LANGUAGE = normalizeLanguageCode(
  window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
);

const resources = {
  de: { translation: de },
  en: { translation: en },
  fr: { translation: fr },
  ja: { translation: ja },
  ko: { translation: ko },
  "zh-CN": { translation: zhCn },
  "zh-TW": { translation: zhTw },
};

void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  lng: DEFAULT_LANGUAGE,
  load: "currentOnly",
  resources,
});

document.documentElement.lang = DEFAULT_LANGUAGE;

i18n.on("languageChanged", (language) => {
  const normalized = normalizeLanguageCode(language);
  document.documentElement.lang = normalized;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
});

export default i18n;
