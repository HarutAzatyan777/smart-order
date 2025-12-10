import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "../config/api";

export default function useMenu() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("menu"));

      if (!res.ok) {
        throw new Error(`Menu request failed (${res.status})`);
      }

      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Menu fetch error:", err);
      setError("Could not load menu. Please retry.");
      setMenu([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  return { menu, loading, error, refresh: loadMenu };
}
