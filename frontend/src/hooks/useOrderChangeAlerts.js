import { useEffect, useRef } from "react";

const defaultFormatStatus = (status) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

export default function useOrderChangeAlerts(orders, notify, formatStatus) {
  const seenOrdersRef = useRef(new Map());
  const baselineReadyRef = useRef(false);
  const syncRunsRef = useRef(0);

  useEffect(() => {
    syncRunsRef.current += 1;
    const previous = seenOrdersRef.current;
    const next = new Map();

    orders.forEach((order) => {
      next.set(order.id, { status: order.status, table: order.table });
    });

    if (!baselineReadyRef.current) {
      seenOrdersRef.current = next;
      if (syncRunsRef.current > 1) {
        baselineReadyRef.current = true;
      }
      return;
    }

    orders.forEach((order) => {
      const prevState = previous.get(order.id);

      if (!prevState) {
        notify?.(`New order for table ${order.table || "-"}.`, "success");
      } else if (prevState.status !== order.status) {
        const tone = order.status === "cancelled" ? "danger" : "info";
        const format = formatStatus || defaultFormatStatus;
        notify?.(
          `Table ${order.table || "-"} is now ${format(order.status)}.`,
          tone
        );
      }
    });

    seenOrdersRef.current = next;
  }, [orders, notify, formatStatus]);
}
