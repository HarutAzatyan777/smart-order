import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../utils/menuI18n";

const STORAGE_KEY = "menuLanguage";
const DEFAULT_LANG = "en";

const normalizeLang = (value) => {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === value);
  return found ? found.code : DEFAULT_LANG;
};

export default function useMenuLanguage() {
  const [language, setLanguage] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLanguage(normalizeLang(stored));
      }
    } catch (err) {
      console.error("Could not read language preference", err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (err) {
      console.error("Could not persist language preference", err);
    }
  }, [language]);

  return { language, setLanguage };
}
