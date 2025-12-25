import { useCallback, useEffect, useState } from "react";
import { fetchKitchenStations } from "../api/stationsApi";

export default function useStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchKitchenStations();
      const list = Array.isArray(res.data) ? res.data : [];
      setStations(list);
    } catch (err) {
      console.error("Stations load error:", err);
      const msg = err?.response?.data?.error || "Cannot load stations.";
      setError(msg);
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stations, loading, error, refresh: load };
}
