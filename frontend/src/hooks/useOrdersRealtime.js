import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../firebase/firestore";
import { collection, onSnapshot } from "firebase/firestore";
import { getOrders } from "../api/ordersApi";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") {
    const ms = value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export default function useOrdersRealtime() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const apiFallbackRef = useRef([]);

  const disableListener =
    String(import.meta?.env?.VITE_DISABLE_ORDERS_LISTENER || "").toLowerCase() === "true";
  const firestoreOnly =
    String(import.meta?.env?.VITE_ORDERS_FIRESTORE_ONLY || "true").toLowerCase() === "true";
  const allowApiFetch = disableListener || !firestoreOnly;

  const loadOnce = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!allowApiFetch) {
      setLoading(false);
      return;
    }
    try {
      const res = await getOrders();
      const list = (Array.isArray(res.data) ? res.data : []).map((o) => ({
        ...o,
        createdAt: toDate(o.createdAt) || null
      }));
      apiFallbackRef.current = list;
      setOrders(list);
    } catch (err) {
      console.error("orders fetch error:", err);
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [allowApiFetch]);

  useEffect(() => {
    // If listener explicitly disabled, rely on API fetch only
    if (disableListener) {
      loadOnce();
      return;
    }

    // If Firestore-only mode is off, do an initial API load as a warm start
    if (!firestoreOnly) {
      loadOnce();
    }

    const ref = collection(db, "orders");

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Detect timestamp (either root-level or nested)
          const createdAt =
            toDate(data.createdAt) ||
            toDate(data.timestamps?.createdAt) ||
            null;

          return {
            id: doc.id,
            ...data,
            createdAt // normalized timestamp
          };
        });

        // Sort safely on frontend
        list.sort((a, b) => {
          const tA = a.createdAt ? a.createdAt.getTime() : 0;
          const tB = b.createdAt ? b.createdAt.getTime() : 0;
          return tB - tA;
        });

        // Keep API fallback if listener is empty (common with empty emulator)
        if (list.length === 0 && apiFallbackRef.current.length > 0) {
          setOrders(apiFallbackRef.current);
        } else {
          setOrders(list);
          apiFallbackRef.current = list;
        }
        setLoading(false);
      },
      (err) => {
        console.error("orders listener error:", err);
        setError("Live orders feed unavailable.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [loadOnce, disableListener, firestoreOnly]);

  return { orders, loading, error, refresh: loadOnce };
}
