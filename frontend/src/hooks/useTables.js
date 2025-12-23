import { useEffect, useState, useCallback } from "react";
import { apiUrl } from "../config/api";

export default function useTables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("tables"));
      if (!res.ok) throw new Error("Could not load tables");
      const data = await res.json();
      const list = Array.isArray(data?.tables) ? data.tables : [];
      setTables(list);
    } catch (err) {
      console.error("Load tables error:", err);
      setError(err.message || "Could not load tables");
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  return { tables, loading, error, refresh: loadTables };
}
