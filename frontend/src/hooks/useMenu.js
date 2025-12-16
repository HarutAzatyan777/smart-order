import { useState, useEffect, useCallback, useRef } from "react";
import { apiUrl } from "../config/api";
import { db } from "../firebase/firestore";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

export default function useMenu() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const apiFallbackRef = useRef([]);

  // Env toggles
  const disableListener =
    String(import.meta?.env?.VITE_DISABLE_MENU_LISTENER || "").toLowerCase() === "true";

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("menu"));

      if (!res.ok) {
        throw new Error(`Menu request failed (${res.status})`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      apiFallbackRef.current = list;
      setMenu(list);
    } catch (err) {
      console.error("Menu fetch error:", err);
      setError("Could not load menu. Please retry.");
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setError("");
    loadMenu(); // fetch once so we have data even if Firestore listener fails

    if (disableListener) {
      // only API fetch, no live updates
      return;
    }

    const menuQuery = query(
      collection(db, "menu"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      menuQuery,
      (snapshot) => {
        const liveMenu = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        // Avoid wiping API data when emulator/prod has no documents
        if (liveMenu.length === 0 && apiFallbackRef.current.length > 0) {
          setMenu(apiFallbackRef.current);
        } else {
          setMenu(liveMenu);
          apiFallbackRef.current = liveMenu;
        }
        setLoading(false);
      },
      (listenerError) => {
        console.error("menu listener error:", listenerError);
        setError("Live menu feed unavailable.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadMenu, disableListener]);

  return { menu, loading, error, refresh: loadMenu };
}
