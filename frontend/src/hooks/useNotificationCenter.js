import { useCallback, useEffect, useRef, useState } from "react";
import useChime from "./useChime";

export default function useNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef([]);
  const playChime = useChime();
  const maxToasts = 4;
  const disableChime =
    String(import.meta?.env?.VITE_DISABLE_CHIME || "").toLowerCase() === "true";

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((note) => note.id !== id));
  }, []);

  const notify = useCallback(
    (message, tone = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setNotifications((current) => {
        const next = [...current, { id, message, tone }];
        if (next.length > maxToasts) {
          next.shift(); // drop oldest
        }
        return next;
      });
      if (!disableChime) {
        playChime(tone);
      }

      const timeoutId = setTimeout(() => dismiss(id), 5200);
      timersRef.current.push(timeoutId);
    },
    [dismiss, playChime, disableChime]
  );

  useEffect(() => {
    const timersSnapshot = [...timersRef.current];
    return () => {
      timersSnapshot.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return { notifications, notify, dismiss };
}
