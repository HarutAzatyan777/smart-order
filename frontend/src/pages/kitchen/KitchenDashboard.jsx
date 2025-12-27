import { useEffect, useMemo, useRef, useState } from "react";
import useStations from "../../hooks/useStations";
import useStationQueue from "../../hooks/useStationQueue";
import {
  claimStationItems,
  updateStationItemsStatus
} from "../../api/stationsApi";
import NotificationStack from "../../components/NotificationStack";
import useNotificationCenter from "../../hooks/useNotificationCenter";
import useInterval from "../../hooks/useInterval";
import { unclaimStationItems } from "../../api/stationsApi";
import useStationMetrics from "../../hooks/useStationMetrics";
import { setAnalyticsContext, trackOrderStage } from "../../utils/analytics";
import "./KitchenDashboard.css";

const COLUMNS = [
  { key: "queued", label: "Queued", actionLabel: "Start batch", next: "preparing", tone: "new" },
  { key: "preparing", label: "Preparing", actionLabel: "Mark ready", next: "ready", tone: "preparing" },
  { key: "ready", label: "Ready", actionLabel: "Complete", next: "delivered", tone: "ready" }
];

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

const getAgeLabel = (date) => {
  if (!date?.getTime) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins === 0) {
    const secs = Math.max(0, Math.floor(diffMs / 1000));
    return `${secs}s`;
  }
  return `${mins}m`;
};

const groupQueueByStatus = (items = []) => {
  const buckets = {
    queued: new Map(),
    preparing: new Map(),
    ready: new Map()
  };

  items.forEach((raw) => {
    const statusKey = raw.status === "ready" || raw.status === "delivered"
      ? "ready"
      : raw.status === "preparing"
      ? "preparing"
      : "queued";

    const key = `${statusKey}-${(raw.name || "Item").toLowerCase()}`;
    if (!buckets[statusKey].has(key)) {
      buckets[statusKey].set(key, {
        key,
        name: raw.name || "Item",
        status: statusKey,
        items: [],
        totalQty: 0,
        tables: new Map(),
        createdAt: null,
        assignedChefName: raw.assignedChefName || ""
      });
    }

    const group = buckets[statusKey].get(key);
    const normalized = {
      ...raw,
      createdAt: toDate(raw.createdAt)
    };
    group.items.push(normalized);
    group.totalQty += Number(raw.qty) || 1;
    const tableKey = raw.table || raw.tableNumber || raw.tableId || "-";
    const entry = group.tables.get(tableKey) || { table: tableKey, qty: 0 };
    entry.qty += Number(raw.qty) || 1;
    group.tables.set(tableKey, entry);
    const createdTs = normalized.createdAt?.getTime?.() || 0;
    const groupTs = group.createdAt?.getTime?.() || 0;
    if (!group.createdAt || (createdTs && createdTs < groupTs)) {
      group.createdAt = normalized.createdAt;
    }
    if (!group.assignedChefName && raw.assignedChefName) {
      group.assignedChefName = raw.assignedChefName;
    }
  });

  const toArray = (map) =>
    Array.from(map.values()).sort((a, b) => {
      const tA = a.createdAt?.getTime?.() || 0;
      const tB = b.createdAt?.getTime?.() || 0;
      return tA - tB;
    });

  return {
    queued: toArray(buckets.queued),
    preparing: toArray(buckets.preparing),
    ready: toArray(buckets.ready)
  };
};

export default function KitchenDashboard() {
  const {
    stations = [],
    loading: stationsLoading,
    error: stationsError,
    refresh: refreshStations
  } = useStations();
  const [selectedStation, setSelectedStation] = useState(null);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [chefName, setChefName] = useState(localStorage.getItem("kitchenChefName") || "");
  const [mode, setMode] = useState(
    localStorage.getItem("kitchenMode") === "compact" ? "compact" : "batch"
  );
  const [dragKey, setDragKey] = useState("");
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const boardRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [metricsByStation, setMetricsByStation] = useState({});

  const { notifications, notify, dismiss } = useNotificationCenter();

  useEffect(() => {
    setAnalyticsContext({ userRole: "kitchen", tableNumber: null });
  }, []);

  const activeStations = useMemo(
    () => stations.filter((s) => s.active !== false),
    [stations]
  );

  useEffect(() => {
    if (!selectedStation && activeStations.length) {
      setSelectedStation(activeStations[0]);
    }
  }, [activeStations, selectedStation]);

  const {
    items: queueItems,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue
  } = useStationQueue(selectedStation?.slug, { pollMs: 3500 });

  const {
    data: stationMetrics,
    // eslint-disable-next-line no-unused-vars
    loading: metricsLoading,
    refresh: refreshMetrics
  } = useStationMetrics(selectedStation?.slug, { pollMs: 9000 });

  useEffect(() => {
    if (stationMetrics?.station) {
      setMetricsByStation((prev) => ({
        ...prev,
        [stationMetrics.station]: stationMetrics
      }));
    }
  }, [stationMetrics]);

  useInterval(() => {
    if (!autoRefresh || !selectedStation?.slug) return;
    refreshQueue();
    refreshMetrics();
  }, autoRefresh ? 5000 : null);

  useEffect(() => {
    const target = boardRef.current;
    if (boardFullscreen && document.fullscreenEnabled && target) {
      target.requestFullscreen({ navigationUI: "hide" }).catch(() => {
        setBoardFullscreen(false);
      });
    } else if (!boardFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setBoardFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [boardFullscreen]);

  const grouped = useMemo(() => groupQueueByStatus(queueItems), [queueItems]);
  const groupIndex = useMemo(() => {
    const map = new Map();
    Object.entries(grouped).forEach(([status, list]) => {
      list.forEach((g) => map.set(g.key, { ...g, status }));
    });
    return map;
  }, [grouped]);
  const flatByStatus = useMemo(() => {
    const buckets = { queued: [], preparing: [], ready: [] };
    queueItems.forEach((item) => {
      const statusKey = item.status === "ready" || item.status === "delivered"
        ? "ready"
        : item.status === "preparing"
        ? "preparing"
        : "queued";
      buckets[statusKey].push({
        ...item,
        createdAt: toDate(item.createdAt)
      });
    });
    Object.keys(buckets).forEach((k) => {
      buckets[k].sort((a, b) => {
        const tA = a.createdAt?.getTime?.() || 0;
        const tB = b.createdAt?.getTime?.() || 0;
        return tA - tB;
      });
    });
    return buckets;
  }, [queueItems]);

  const counts = useMemo(
    () => ({
      queued: grouped.queued.reduce((sum, g) => sum + g.totalQty, 0),
      preparing: grouped.preparing.reduce((sum, g) => sum + g.totalQty, 0),
      ready: grouped.ready.reduce((sum, g) => sum + g.totalQty, 0)
    }),
    [grouped]
  );

  const handleStationChange = (station) => {
    setSelectedStation(station);
    setError("");
  };

  const handleBatchAction = async (group, nextStatus) => {
    if (!group?.items?.length || !selectedStation?.slug || !nextStatus) return;
    try {
      setActionId(`${group.key}-${nextStatus}`);
      setError("");
      await updateStationItemsStatus(selectedStation.slug, {
        itemIds: group.items.map((i) => i.id || i.itemId),
        status: nextStatus,
        chefName: chefName || undefined,
        chefId: chefName || undefined,
        batchId: group.key
      });
      notify?.(
        `${group.totalQty} x ${group.name} moved to ${nextStatus}.`,
        nextStatus === "ready" ? "success" : "info"
      );
      const tableEntries = Array.from(group.tables?.values?.() || []);
      const tableNumber = tableEntries.length === 1 ? tableEntries[0].table : undefined;
      trackOrderStage(nextStatus, {
        station: selectedStation.slug,
        batch_id: group.key,
        item_name: group.name,
        quantity: group.totalQty,
        table_number: tableNumber,
        chef_name: chefName || undefined
      });
      refreshQueue();
    } catch (err) {
      console.error("Batch action error:", err);
      const msg = err?.response?.data?.error || "Could not update items.";
      setError(msg);
    } finally {
      setActionId("");
    }
  };

  const handleBatchDrop = async (groupKey, targetStatus) => {
    const group = groupIndex.get(groupKey);
    if (!group || group.status === targetStatus || !selectedStation?.slug) return;
    try {
      setActionId(`${group.key}-${targetStatus}`);
      setError("");
      await updateStationItemsStatus(selectedStation.slug, {
        itemIds: group.items.map((i) => i.id || i.itemId),
        status: targetStatus,
        chefName: chefName || undefined,
        chefId: chefName || undefined,
        batchId: group.key
      });
      notify?.(
        `Moved ${group.totalQty} x ${group.name} to ${targetStatus}.`,
        targetStatus === "ready" ? "success" : "info"
      );
      const tableEntries = Array.from(group.tables?.values?.() || []);
      const tableNumber = tableEntries.length === 1 ? tableEntries[0].table : undefined;
      trackOrderStage(targetStatus, {
        station: selectedStation.slug,
        batch_id: group.key,
        item_name: group.name,
        quantity: group.totalQty,
        table_number: tableNumber,
        chef_name: chefName || undefined
      });
      refreshQueue();
    } catch (err) {
      console.error("Drop move error:", err);
      const msg = err?.response?.data?.error || "Could not move batch.";
      setError(msg);
    } finally {
      setActionId("");
    }
  };

  const handleClaim = async (group) => {
    if (!group?.items?.length || !selectedStation?.slug) return;
    try {
      setActionId(`claim-${group.key}`);
      setError("");
      await claimStationItems(selectedStation.slug, {
        itemIds: group.items.map((i) => i.id || i.itemId),
        chefName: chefName || undefined,
        chefId: chefName || undefined,
        batchId: group.key
      });
      notify?.(`Batch claimed by ${chefName || "chef"}.`, "info");
      refreshQueue();
    } catch (err) {
      console.error("Claim error:", err);
      const msg = err?.response?.data?.error || "Could not assign batch.";
      setError(msg);
    } finally {
      setActionId("");
    }
  };

  const handleUnclaim = async (group) => {
    if (!group?.items?.length || !selectedStation?.slug) return;
    try {
      setActionId(`unclaim-${group.key}`);
      setError("");
      await unclaimStationItems(selectedStation.slug, {
        itemIds: group.items.map((i) => i.id || i.itemId)
      });
      notify?.(`Batch released.`, "info");
      refreshQueue();
    } catch (err) {
      console.error("Unclaim error:", err);
      const msg = err?.response?.data?.error || "Could not unclaim batch.";
      setError(msg);
    } finally {
      setActionId("");
    }
  };

  const onChefChange = (value) => {
    setChefName(value);
    localStorage.setItem("kitchenChefName", value);
  };

  const renderHealthBadge = (station) => {
    const metrics = metricsByStation[station.slug];
    if (!metrics) return null;
    const state = metrics.health || "healthy";
    const label =
      state === "critical" ? "Critical" : state === "warning" ? "Warning" : "Healthy";
    return <span className={`health-badge ${state}`}>{label}</span>;
  };

  const onModeChange = (value) => {
    setMode(value);
    localStorage.setItem("kitchenMode", value);
  };

  const handleSingleAction = async (item, nextStatus) => {
    if (!item?.id || !selectedStation?.slug || !nextStatus) return;
    try {
      setActionId(`${item.id}-${nextStatus}`);
      setError("");
      await updateStationItemsStatus(selectedStation.slug, {
        itemIds: [item.id],
        status: nextStatus,
        chefName: chefName || undefined,
        chefId: chefName || undefined,
        batchId: item.batchId || item.name
      });
      trackOrderStage(nextStatus, {
        station: selectedStation.slug,
        item_id: item.id,
        item_name: item.name,
        quantity: item.qty || 1,
        table_number: item.table || item.tableNumber || item.tableId || undefined,
        chef_name: chefName || undefined
      });
      refreshQueue();
    } catch (err) {
      console.error("Item action error:", err);
      const msg = err?.response?.data?.error || "Could not update item.";
      setError(msg);
    } finally {
      setActionId("");
    }
  };

  const findColumnFromTouch = (touchEvent) => {
    const touch = touchEvent.changedTouches?.[0];
    if (!touch) return null;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return null;
    const column = el.closest?.("[data-column]");
    return column?.dataset?.column || null;
  };

  const preventIfCancelable = (event) => {
    if (event?.cancelable) {
      event.preventDefault();
    }
  };

  const renderGroupCard = (group, column) => {
    const age = getAgeLabel(group.createdAt);
    const tables = Array.from(group.tables.values()).sort((a, b) => a.table.toString().localeCompare(b.table.toString()));
    const primaryTable = tables[0];
    const extraTables = Math.max(0, tables.length - 1);
    const statusKey = column.key;
    const statusLabel = column.label;
    const actionDisabled = actionId === `${group.key}-${column.next}`;

    const handleCardAction = () => {
      if (!column.next || actionDisabled) return;
      handleBatchAction(group, column.next);
    };

    const handleChip = (fn) => (event) => {
      event.stopPropagation();
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      fn();
    };

    return (
      <button
        key={group.key}
        type="button"
        className={`k-card batch-card status-${statusKey}`}
        onClick={handleCardAction}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", group.key);
          setDragKey(group.key);
        }}
        onDragEnd={() => setDragKey("")}
        onTouchStart={() => setDragKey(group.key)}
        onTouchEnd={(e) => {
          const columnKey = findColumnFromTouch(e);
          if (columnKey) {
            preventIfCancelable(e);
            handleBatchDrop(group.key, columnKey);
          }
          setDragKey("");
        }}
        data-dragging={dragKey === group.key ? "true" : undefined}
        disabled={actionDisabled}
        aria-busy={actionDisabled}
        aria-label={`${statusLabel} batch ${group.name}, ${group.totalQty} items`}
      >
        <div className="k-card-top">
          <div className="k-top-line">
            <span className="k-pill table-pill">
              Table {primaryTable?.table ?? "-"}
            </span>
            {extraTables > 0 ? <span className="k-pill subtle">+{extraTables} more</span> : null}
          </div>
          <div className="k-top-meta">
            <span className="k-age">{age}</span>
            <span className="drag-hint" aria-hidden>
              ↔ drag to move
            </span>
          </div>
        </div>

        <div className="k-card-body">
          <p className="k-item-title">{group.name}</p>
          <p className="k-qty-line">x{group.totalQty} items</p>
          <div className="k-items table-list">
            {tables.map((entry) => (
              <div key={entry.table} className="k-item">
                <span className="k-item-name">Table {entry.table}</span>
                <span className="k-item-qty">x{entry.qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="k-card-footer">
          <span className={`status-pill status-${statusKey}`}>
            {statusLabel}
          </span>
          <div className="meta-row">
            <span className="pill light">{group.items.length} tickets</span>
            {group.assignedChefName ? (
              <span className="pill subtle">Chef: {group.assignedChefName}</span>
            ) : null}
          </div>
        </div>

        {selectedStation?.multiChefEnabled ? (
          <div className="assign-row within-card" aria-label="Batch assignment">
            <span
              role="button"
              tabIndex={0}
              className="ghost-chip"
              onClick={handleChip(() => handleClaim(group))}
              onKeyDown={handleChip(() => handleClaim(group))}
              aria-disabled={actionId === `claim-${group.key}`}
            >
              {actionId === `claim-${group.key}` ? "Assigning..." : "Claim"}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="ghost-chip danger"
              onClick={handleChip(() => handleUnclaim(group))}
              onKeyDown={handleChip(() => handleUnclaim(group))}
              aria-disabled={actionId === `unclaim-${group.key}`}
            >
              {actionId === `unclaim-${group.key}` ? "Releasing..." : "Unclaim"}
            </span>
            {group.assignedChefName ? (
              <span className="pill subtle">Owner: {group.assignedChefName}</span>
            ) : (
              <span className="muted small">Set your name above</span>
            )}
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div
      ref={boardRef}
      className={`kitchen-dashboard${boardFullscreen ? " is-fullscreen" : ""}`}
    >
      <NotificationStack notifications={notifications} onDismiss={dismiss} />

      <header className="kitchen-header">
        <div>
          <p className="kitchen-eyebrow">KITCHEN</p>
          <h1 className="kitchen-title">Station board</h1>
          <p className="kitchen-subtitle">
            Batches by station. Start, prep, and finish items across tables.
          </p>
          <div className="chef-input">
            <label htmlFor="chef-name">Your name (for claims)</label>
            <input
              id="chef-name"
              type="text"
              value={chefName}
              onChange={(e) => onChefChange(e.target.value)}
              placeholder="Chef name"
            />
          </div>
        </div>
        <div className="k-header-actions">
          <div className="kitchen-counts">
            <span className="count-badge new">Queued: {counts.queued}</span>
            <span className="count-badge preparing">Prep: {counts.preparing}</span>
            <span className="count-badge ready">Ready: {counts.ready}</span>
            <span className="live-dot">Live</span>
          </div>
          <button
            type="button"
            className="fullscreen-btn"
            onClick={() => setBoardFullscreen((v) => !v)}
            aria-pressed={boardFullscreen}
            aria-label={boardFullscreen ? "Exit fullscreen board" : "Enter fullscreen board"}
          >
            <span aria-hidden>{boardFullscreen ? "⤢" : "⤢"}</span>
            <span className="fullscreen-label">
              {boardFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </span>
          </button>
        </div>
      </header>

      <div className="mode-toggle">
        <label className={mode === "compact" ? "active" : ""}>
          <input
            type="radio"
            name="k-mode"
            value="compact"
            checked={mode === "compact"}
            onChange={() => onModeChange("compact")}
          />
          Compact mode
        </label>
        <label className={mode === "batch" ? "active" : ""}>
          <input
            type="radio"
            name="k-mode"
            value="batch"
            checked={mode === "batch"}
            onChange={() => onModeChange("batch")}
          />
          Batch focus
        </label>
      </div>

      {stationsError ? (
        <div className="error-message">
          <span>{stationsError}</span>
          <button className="link-btn" onClick={refreshStations}>Retry</button>
        </div>
      ) : null}

      {(error || queueError) && (
        <div className="error-message">
          <span>{error || queueError}</span>
          <button className="link-btn" onClick={refreshQueue}>
            Retry
          </button>
        </div>
      )}

      <div className="station-tabs">
        {stationsLoading && !selectedStation ? (
          <span className="muted small">Loading stations...</span>
        ) : activeStations.length === 0 ? (
          <span className="muted small">No active stations configured.</span>
        ) : (
          activeStations.map((station) => (
            <button
              key={station.id}
              className={`station-pill ${selectedStation?.id === station.id ? "active" : ""}`}
              style={{ borderColor: station.color || "#0f172a" }}
              onClick={() => handleStationChange(station)}
            >
              <span className="pill-dot" style={{ background: station.color || "#0f172a" }} />
              {station.name}
              {renderHealthBadge(station)}
              {station.batchingEnabled === false ? <span className="pill subtle">No batching</span> : null}
            </button>
          ))
        )}
      </div>

      <div className="kitchen-board">
        {COLUMNS.map((col) => {
          const list = grouped[col.key] || [];
          const compactList = flatByStatus[col.key] || [];
          return (
            <div
              key={col.key}
              className={`k-column tone-${col.tone}`}
              data-column={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const groupKey = e.dataTransfer.getData("text/plain");
                if (groupKey) handleBatchDrop(groupKey, col.key);
              }}
              onTouchEnd={(e) => {
                if (!dragKey) return;
                preventIfCancelable(e);
                handleBatchDrop(dragKey, col.key);
                setDragKey("");
              }}
            >
              <div className="k-column-head">
                <h2>{col.label}</h2>
                <span className="k-column-count">{list.length || 0}</span>
              </div>
              <div className="k-column-body">
                {(queueLoading && list.length === 0) || stationsLoading ? (
                  <div className="k-empty">Loading...</div>
                ) : mode === "compact" ? (
                  compactList.length ? (
                    compactList.map((item) => (
                      <article key={item.id} className="k-card compact-card">
                        <div className="compact-row">
                          <div>
                            <p className="compact-name">{item.name || "Item"}</p>
                            <p className="compact-qty">x{item.qty || 1}</p>
                          </div>
                          <div className="compact-meta">
                            <span className="compact-table">T{item.table || "-"}</span>
                            <span className="compact-age">{getAgeLabel(item.createdAt)}</span>
                          </div>
                        </div>
                        {col.next ? (
                          <button
                            className="k-action compact"
                            onClick={() => handleSingleAction(item, col.next)}
                            disabled={actionId === `${item.id}-${col.next}`}
                          >
                            {actionId === `${item.id}-${col.next}` ? "..." : col.actionLabel}
                          </button>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="k-empty">No items</div>
                  )
                ) : list.length ? (
                  list.map((group) => renderGroupCard(group, col))
                ) : (
                  <div className="k-empty">No items</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
