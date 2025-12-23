import { useState, useEffect, useCallback, useRef } from "react";
import { apiUrl } from "../config/api";
import { db } from "../firebase/firestore";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

export default function useMenu(language = "en") {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const apiFallbackRef = useRef([]);

  // Env toggles
  const disableListener =
    String(import.meta?.env?.VITE_DISABLE_MENU_LISTENER || "").toLowerCase() === "true";

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("menu/categories"));
      if (!res.ok) throw new Error("Category request failed");
      const data = await res.json();
      if (Array.isArray(data?.categories)) {
        setCategories(
          [...data.categories].sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      }
    } catch (err) {
      console.error("Category fetch error:", err);
    }
  }, []);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("menu") + `?lang=${encodeURIComponent(language)}`);

      if (!res.ok) {
        throw new Error(`Menu request failed (${res.status})`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      apiFallbackRef.current = list;
      setMenu(list);
      loadCategories();
    } catch (err) {
      console.error("Menu fetch error:", err);
      setError("Could not load menu. Please retry.");
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }, [language, loadCategories]);

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
    loadCategories();
  }, [loadMenu, disableListener, language, loadCategories]);

  return {
    menu,
    loading,
    error,
    refresh: loadMenu,
    categories
  };
}
