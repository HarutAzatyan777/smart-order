import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "../config/api";
import { db } from "../firebase/firestore";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

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
    setError("");

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

        setMenu(liveMenu);
        setLoading(false);
      },
      (listenerError) => {
        console.error("menu listener error:", listenerError);
        setError("Live menu feed unavailable.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { menu, loading, error, refresh: loadMenu };
}
