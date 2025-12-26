import { useEffect, useMemo, useState } from "react";
import {
  applyStoredConsent,
  ensureConsentDefaults,
  updateConsent
} from "../utils/analytics";

const LANG_MAP = {
  en: {
    title: "Privacy & cookies",
    body: "We use cookies to run analytics and improve Smart Order. Choose how you want to share data.",
    acceptAll: "Accept all",
    analyticsOnly: "Analytics only",
    reject: "Reject",
    manage: "Privacy settings",
    policy: "Privacy policy"
  },
  ru: {
    title: "Конфиденциальность и cookies",
    body: "Мы используем cookies для аналитики и улучшения сервиса Smart Order. Выберите уровень согласия.",
    acceptAll: "Принять все",
    analyticsOnly: "Только аналитика",
    reject: "Отклонить",
    manage: "Настройки приватности",
    policy: "Политика конфиденциальности"
  },
  hy: {
    title: "Գաղտնիություն և cookie-ներ",
    body: "Մենք օգտագործում ենք cookie-ներ վերլուծության և Smart Order-ի բարելավման համար։ Ընտրեք համաձայնության մակարդակը։",
    acceptAll: "Ընդունել բոլորը",
    analyticsOnly: "Միայն անալիտիկա",
    reject: "Մերժել",
    manage: "Գաղտնիության կարգավորումներ",
    policy: "Գաղտնիության քաղաքականություն"
  }
};

const POLICY_URL = "/privacy";

function detectLanguage() {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || navigator.userLanguage || "en";
  if (lang.toLowerCase().startsWith("ru")) return "ru";
  if (lang.toLowerCase().startsWith("hy")) return "hy";
  return "en";
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState(detectLanguage());
  const [copyOverrides, setCopyOverrides] = useState(null);
  const text = useMemo(() => {
    const base = LANG_MAP[language] || LANG_MAP.en;
    const override = copyOverrides?.[language] || {};
    return { ...base, ...override };
  }, [language, copyOverrides]);

  useEffect(() => {
    ensureConsentDefaults();
    applyStoredConsent();
    try {
      const stored = window.localStorage.getItem("smart-order-consent-v2");
      setVisible(!stored);
      const copy = window.localStorage.getItem("smart-consent-banner-copy");
      if (copy) {
        setCopyOverrides(JSON.parse(copy));
      }
    } catch (err) {
      console.error("Consent init error:", err);
    }
    setReady(true);

    const handleOpen = () => setVisible(true);
    window.addEventListener("smart-consent-open", handleOpen);
    return () => window.removeEventListener("smart-consent-open", handleOpen);
  }, []);

  const actions = useMemo(
    () => [
      { id: "accept_all", label: text.acceptAll, variant: "primary" },
      { id: "analytics_only", label: text.analyticsOnly, variant: "ghost" },
      { id: "reject", label: text.reject, variant: "ghost danger" }
    ],
    [text.acceptAll, text.analyticsOnly, text.reject]
  );

  const onSelect = (choice) => {
    updateConsent(choice);
    setVisible(false);
  };

  if (!ready) return null;

  return (
    <>
      {visible ? (
        <div className="consent-banner">
          <div className="consent-content">
            <div>
              <p className="consent-title">{text.title}</p>
              <p className="consent-body">{text.body}</p>
              <div className="consent-lang">
                {Object.keys(LANG_MAP).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`consent-lang-btn${language === code ? " active" : ""}`}
                    onClick={() => setLanguage(code)}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="consent-actions">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`consent-btn ${action.variant}`}
                  onClick={() => onSelect(action.id)}
                >
                  {action.label}
                </button>
              ))}
              <a className="consent-link" href={POLICY_URL}>
                {text.policy}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {!visible ? (
        <button
          type="button"
          className="consent-manage-btn"
          onClick={() => setVisible(true)}
          aria-label={text.manage}
        >
          {text.manage}
        </button>
      ) : null}
    </>
  );
}
