export const ACTIVE_STATUSES = new Set(["new", "submitted", "accepted", "preparing", "ready", "delivered"]);
export const CLOSED_STATUSES = new Set(["closed", "cancelled", "canceled"]);

export function normalizeStatus(status) {
  if (!status) return "new";
  return String(status).toLowerCase();
}

export function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch (err) {
      console.error("Timestamp parse error:", err);
    }
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }

  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6));
  }

  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  return null;
}

export function normalizeOrder(order) {
  const createdAt =
    normalizeTimestamp(order.createdAt) || normalizeTimestamp(order.timestamps?.createdAt);

  return {
    ...order,
    status: normalizeStatus(order.status),
    createdAt,
    items: Array.isArray(order.items) ? order.items : []
  };
}

export function fetchJson(url, options, fallbackMessage) {
  return fetch(url, options).then(async (res) => {
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || fallbackMessage || "Request failed");
    }

    return data;
  });
}

export function formatCurrency(value) {
  const number = Number(value) || 0;
  return `${number.toLocaleString("en-US")} AMD`;
}

export function getItemCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item?.qty || 1), 0);
}

export function getAgeLabel(date) {
  if (!date?.getTime) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h${rem ? ` ${rem}m` : ""} ago`;
}

export function isLagging(order) {
  if (!order?.createdAt?.getTime) return false;
  return Date.now() - order.createdAt.getTime() > 15 * 60 * 1000;
}

export function formatStatus(status) {
  const normalized = normalizeStatus(status);
  const map = {
    new: "New",
    submitted: "Submitted",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
    closed: "Closed",
    cancelled: "Cancelled",
    canceled: "Cancelled"
  };
  return map[normalized] || normalized;
}

export function getAdminOrderActions(status) {
  const normalized = normalizeStatus(status);
  if (CLOSED_STATUSES.has(normalized)) return [];

  const actions = [];
  if (normalized !== "closed") actions.push({ label: "Close order", status: "closed" });
  if (normalized !== "cancelled") {
    actions.push({ label: "Cancel order", status: "cancelled", tone: "danger-btn" });
  }

  return actions;
}
