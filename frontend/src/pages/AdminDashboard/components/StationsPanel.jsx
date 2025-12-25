import { useEffect, useMemo, useState } from "react";
import { fetchStationMetrics } from "../../../api/stationsApi";

export default function StationsPanel({
  stations = [],
  routing = {},
  categories = [],
  loading,
  savingRouting,
  stationActionId,
  onCreate,
  onUpdate,
  onDelete,
  onSaveRouting,
  onReload
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0f172a");
  const [batchingEnabled, setBatchingEnabled] = useState(true);
  const [multiChefEnabled, setMultiChefEnabled] = useState(false);
  const [maxBatchSize, setMaxBatchSize] = useState("");
  const [categoryMap, setCategoryMap] = useState(routing.categories || {});
  const [itemMap, setItemMap] = useState(routing.items || {});
  const [defaultStation, setDefaultStation] = useState(routing.defaultStation || "");
  const [overrideKey, setOverrideKey] = useState("");
  const [overrideStation, setOverrideStation] = useState("");
  const [deleteFallback, setDeleteFallback] = useState("");
  const [metricsMap, setMetricsMap] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    // Sync incoming routing with local editors
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoryMap(routing.categories || {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItemMap(routing.items || {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDefaultStation(routing.defaultStation || "");
  }, [routing]);

  const stationOptions = useMemo(
    () =>
      stations.map((s) => ({
        value: s.slug || s.id,
        label: s.name,
        id: s.id
      })),
    [stations]
  );

  useEffect(() => {
    const loadMetrics = async () => {
      if (!stations.length) return;
      setMetricsLoading(true);
      try {
        const active = stations.filter((s) => s.active !== false).slice(0, 6);
        const results = await Promise.all(
          active.map(async (s) => {
            try {
              const res = await fetchStationMetrics(s.slug || s.id);
              return [s.id, res.data];
            } catch (err) {
              console.error("Station metrics fetch error:", err);
              return [s.id, null];
            }
          })
        );
        setMetricsMap((prev) => {
          const next = { ...prev };
          results.forEach(([id, data]) => {
            if (id) next[id] = data;
          });
          return next;
        });
      } finally {
        setMetricsLoading(false);
      }
    };
    loadMetrics();
  }, [stations]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate?.({
      name: name.trim(),
      color,
      batchingEnabled,
      multiChefEnabled,
      maxBatchSize: maxBatchSize ? Number(maxBatchSize) : null
    });
    setName("");
    setMaxBatchSize("");
  };

  const handleRoutingSave = () => {
    onSaveRouting?.({
      categories: categoryMap,
      items: itemMap,
      defaultStation: defaultStation || null
    });
  };

  const addOverride = () => {
    const key = overrideKey.trim().toLowerCase();
    if (!key || !overrideStation) return;
    setItemMap((prev) => ({ ...prev, [key]: overrideStation }));
    setOverrideKey("");
  };

  const removeOverride = (key) => {
    setItemMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const sortedOverrides = useMemo(
    () => Object.entries(itemMap || {}).sort((a, b) => a[0].localeCompare(b[0])),
    [itemMap]
  );

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  return (
    <section className="admin-panel wide">
      <div className="panel-heading">
        <div>
          <p className="eyebrow soft">Stations</p>
          <h2>Kitchen stations & routing</h2>
          <p className="muted">
            Configure station settings, batching, and category routing for automatic item flow.
          </p>
        </div>
        <div className="panel-actions">
          <button className="ghost-btn" onClick={onReload} disabled={loading}>
            {loading ? "Refreshing..." : "Reload"}
          </button>
        </div>
      </div>

      <div className="station-form">
        <input
          type="text"
          placeholder="Station name (e.g., Pizza)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="color"
          value={color}
          aria-label="Station color"
          onChange={(e) => setColor(e.target.value)}
        />
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={batchingEnabled}
            onChange={(e) => setBatchingEnabled(e.target.checked)}
          />
          <span>Batching enabled</span>
        </label>
        <label className="inline-toggle">
          <input
            type="checkbox"
            checked={multiChefEnabled}
            onChange={(e) => setMultiChefEnabled(e.target.checked)}
          />
          <span>Multi-chef assignment</span>
        </label>
        <input
          type="number"
          min="1"
          placeholder="Max batch size (optional)"
          value={maxBatchSize}
          onChange={(e) => setMaxBatchSize(e.target.value)}
        />
        <button className="outline-btn" onClick={handleCreate} disabled={loading || stationActionId === "new"}>
          {stationActionId === "new" ? "Saving..." : "Add station"}
        </button>
      </div>

      {stations.length === 0 ? (
        <div className="empty-state small">No stations yet. Add one to start routing items.</div>
      ) : (
        <div className="station-grid">
          {stations.map((station) => (
            <div key={station.id} className="station-card">
              <div className="station-head">
                <div className="pill-dot" style={{ background: station.color || "#0f172a" }} />
                <div>
                  <p className="station-name">{station.name}</p>
                  <p className="muted small">Slug: {station.slug}</p>
                </div>
                {metricsLoading ? null : metricsMap[station.id]?.health ? (
                  <span className={`health-badge ${metricsMap[station.id].health}`}>
                    {metricsMap[station.id].health}
                  </span>
                ) : null}
              </div>
              <div className="station-flags">
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={station.active !== false}
                    onChange={(e) => onUpdate?.(station.id, { active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={station.batchingEnabled !== false}
                    onChange={(e) => onUpdate?.(station.id, { batchingEnabled: e.target.checked })}
                  />
                  <span>Batching</span>
                </label>
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={station.multiChefEnabled === true}
                    onChange={(e) => onUpdate?.(station.id, { multiChefEnabled: e.target.checked })}
                  />
                  <span>Multi-chef</span>
                </label>
              </div>
              <div className="station-row">
                <label>Performance</label>
                <div className="metrics-row">
                  <span>Queue</span>
                  <strong>{metricsMap[station.id]?.queueLength ?? "—"}</strong>
                </div>
                <div className="metrics-row">
                  <span>Avg prep (15m)</span>
                  <strong>{formatDuration(metricsMap[station.id]?.windows?.["15m"]?.avgPrepTimeMs)}</strong>
                </div>
                <div className="metrics-row">
                  <span>Samples</span>
                  <strong>{metricsMap[station.id]?.windows?.["15m"]?.samples ?? 0}</strong>
                </div>
              </div>
              <div className="station-row">
                <label>Max batch size</label>
                <input
                  type="number"
                  min="1"
                  value={station.maxBatchSize || ""}
                  onChange={(e) =>
                    onUpdate?.(station.id, {
                      maxBatchSize: e.target.value ? Number(e.target.value) : null
                    })
                  }
                />
              </div>
              <div className="delete-row">
                <select
                  value={deleteFallback}
                  onChange={(e) => setDeleteFallback(e.target.value)}
                  className="compact-select"
                >
                  <option value="">No reassignment</option>
                  {stationOptions
                    .filter((s) => s.id !== station.id)
                    .map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        Reassign to {opt.label}
                      </option>
                    ))}
                </select>
                <button
                  className="danger-btn small"
                  disabled={stationActionId === station.id}
                  onClick={() => onDelete?.(station.id, deleteFallback || null)}
                >
                  {stationActionId === station.id ? "Removing..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="routing-panel">
        <div className="routing-header">
          <div>
            <p className="order-label">Routing rules</p>
            <p className="muted small">
              Categories map to stations; overrides let you pin specific items.
            </p>
          </div>
          <button className="ghost-btn" onClick={handleRoutingSave} disabled={savingRouting}>
            {savingRouting ? "Saving..." : "Save routing"}
          </button>
        </div>

        <div className="routing-grid">
          <div>
            <label className="order-label">Default station</label>
            <select
              value={defaultStation || ""}
              onChange={(e) => setDefaultStation(e.target.value)}
              className="admin-input compact"
            >
              <option value="">No default</option>
              {stationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="routing-table">
              <div className="routing-row header">
                <span>Category</span>
                <span>Station</span>
              </div>
              {(categories || []).map((cat) => (
                <div key={cat.key} className="routing-row">
                  <span>{cat.labels?.en || cat.labels?.hy || cat.key}</span>
                  <select
                    value={categoryMap[cat.key] || ""}
                    onChange={(e) =>
                      setCategoryMap((prev) => ({
                        ...prev,
                        [cat.key]: e.target.value || undefined
                      }))
                    }
                  >
                    <option value="">None</option>
                    {stationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="order-label">Item overrides</label>
            <div className="override-row">
              <input
                type="text"
                placeholder="Item name or menu ID"
                value={overrideKey}
                onChange={(e) => setOverrideKey(e.target.value)}
              />
              <select value={overrideStation} onChange={(e) => setOverrideStation(e.target.value)}>
                <option value="">Station</option>
                {stationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button className="outline-btn small" onClick={addOverride}>
                Add
              </button>
            </div>

            <div className="override-list">
              {sortedOverrides.length === 0 ? (
                <p className="muted small">No overrides yet.</p>
              ) : (
                sortedOverrides.map(([key, station]) => (
                  <div key={key} className="override-pill">
                    <span>
                      {key} → {station}
                    </span>
                    <button className="ghost-btn small" onClick={() => removeOverride(key)}>
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
