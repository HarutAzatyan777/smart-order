import { useCallback, useEffect, useRef, useState } from "react";
import useChime from "./useChime";

export default function useNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef([]);
  const playChime = useChime();

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((note) => note.id !== id));
  }, []);

  const notify = useCallback(
    (message, tone = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setNotifications((current) => [...current, { id, message, tone }]);
      playChime(tone);

      const timeoutId = setTimeout(() => dismiss(id), 5200);
      timersRef.current.push(timeoutId);
    },
    [dismiss, playChime]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return { notifications, notify, dismiss };
}
