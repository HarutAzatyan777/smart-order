import { useCallback, useEffect, useState } from "react";
import { fetchStationMetrics } from "../api/stationsApi";

export default function useStationMetrics(slug, { pollMs = 8000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchStationMetrics(slug);
      setData(res.data || null);
    } catch (err) {
      console.error("Station metrics error:", err);
      const msg = err?.response?.data?.error || "Cannot load station metrics.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
    if (!slug || !pollMs) return undefined;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [slug, pollMs, load]);

  return { data, loading, error, refresh: load };
}
