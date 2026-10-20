import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ar from "./ar.json";

export type Language = "en" | "ar";

const STORAGE_KEY = "raha.lang";

function savedLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

// Arabic flips the whole page right-to-left. Because the CSS uses logical
// properties (margin-inline-start instead of margin-left), the layout mirrors
// itself automatically when dir changes.
function applyToDocument(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: savedLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes text
});

applyToDocument(i18n.language);
i18n.on("languageChanged", (lang) => {
  applyToDocument(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // private mode: the choice just won't be remembered
  }
});

export default i18n;
