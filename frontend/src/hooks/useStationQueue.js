import { useCallback, useEffect, useRef, useState } from "react";
import { fetchStationQueue } from "../api/stationsApi";

export default function useStationQueue(stationSlug, { pollMs = 4000 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    if (!stationSlug) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchStationQueue(stationSlug);
      const payload = res.data || {};
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (err) {
      console.error("Station queue error:", err);
      const msg = err?.response?.data?.error || "Cannot load station queue.";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [stationSlug]);

  useEffect(() => {
    load();
    if (!stationSlug || !pollMs) return undefined;

    timerRef.current = setInterval(load, pollMs);
    return () => clearInterval(timerRef.current);
  }, [stationSlug, pollMs, load]);

  return { items, loading, error, refresh: load };
}
