import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import { formatCurrency } from "../helpers";
import { updateConsent } from "../../../utils/analytics";

const RANGE_OPTIONS = [
  { id: "1d", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" }
];

const statusColors = {
  New: "#0ea5e9",
  Preparing: "#f59e0b",
  Ready: "#0ea676",
  Delivered: "#0f172a",
  Cancelled: "#ef4444"
};

function numberFormat(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("en-US");
}

function percentFormat(value) {
  const n = Number(value) || 0;
  return `${(n * 100).toFixed(1)}%`;
}

function ProgressBar({ label, value, max = 100 }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress-row">
      <div className="progress-header">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBars({ data = [], height = 80 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mini-bars" style={{ minHeight: height }}>
      {data.map((d) => (
        <div key={d.label} className="mini-bar" title={`${d.label}: ${d.value}`}>
          <div
            className="mini-bar-fill"
            style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }}
          />
          <span className="mini-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function TableList({ title, rows, columns, emptyLabel }) {
  return (
    <div className="insight-card">
      <div className="insight-head">
        <h4>{title}</h4>
      </div>
      {rows?.length ? (
        <div className="insight-table">
          <div className="insight-table-head">
            {columns.map((col) => (
              <span key={col.key}>{col.label}</span>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.name || row.table} className="insight-table-row">
              {columns.map((col) => (
                <span key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-insight">{emptyLabel}</div>
      )}
    </div>
  );
}

export default function AnalyticsPanel({
  analytics,
  loading,
  error,
  activeRange = "7d",
  onRangeChange,
  onReload
}) {
  const data = analytics || {};
  const kpis = data.kpis || {};
  const ordersSeries = data.ordersOverTime || [];
  const peakHours = data.peakHours || [];
  const status = data.statusBreakdown || [];
  const devices = data.deviceBreakdown || [];
  const topItems = data.topItems || [];
  const lowItems = data.lowItems || [];
  const viewedNotOrdered = data.viewedNotOrdered || [];
  const tables = data.tables || [];
  const [bannerCopy, setBannerCopy] = useState(() => {
    if (typeof window === "undefined") return { en: {}, ru: {}, hy: {} };
    try {
      const raw = window.localStorage.getItem("smart-consent-banner-copy");
      return raw ? JSON.parse(raw) : { en: {}, ru: {}, hy: {} };
    } catch {
      return { en: {}, ru: {}, hy: {} };
    }
  });

  useEffect(() => {
    // sync banner copy from storage if it was changed elsewhere
    const onStorage = (e) => {
      if (e.key === "smart-consent-banner-copy" && typeof window !== "undefined") {
        try {
          const next = e.newValue ? JSON.parse(e.newValue) : { en: {}, ru: {}, hy: {} };
          setBannerCopy(next);
        } catch {
          setBannerCopy({ en: {}, ru: {}, hy: {} });
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveBannerCopy = () => {
    try {
      window.localStorage.setItem("smart-consent-banner-copy", JSON.stringify(bannerCopy));
    } catch (err) {
      console.error("Save banner copy error:", err);
    }
  };

  const resetBannerCopy = () => {
    setBannerCopy({ en: {}, ru: {}, hy: {} });
    try {
      window.localStorage.removeItem("smart-consent-banner-copy");
    } catch (err) {
      console.error("Reset banner copy error:", err);
    }
  };

  const maxOrders = Math.max(...ordersSeries.map((o) => o.value), 1);

  return (
    <div className="admin-panel analytics-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow-1 soft">Analytics</p>
          <h3>Performance snapshot</h3>
          <p className="muted small">
            Orders, revenue, menu conversion, and kitchen speed. Source: GA4 (phase 1), BigQuery (phase 2).
          </p>
        </div>
        <div className="panel-actions">
          <div className="range-toggle">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`ghost-btn small ${activeRange === opt.id ? "is-active" : ""}`}
                onClick={() => onRangeChange?.(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className="ghost-btn small" onClick={onReload} disabled={loading}>
            {loading ? "Refreshing..." : "Reload"}
          </button>
        </div>
      </div>

      {error ? <div className="admin-alert">{error}</div> : null}

      <div className="insights-grid">
        <div className="kpi-grid">
          <StatCard label="Orders today" value={numberFormat(kpis.ordersToday || 0)} hint="Live total" />
          <StatCard label="Orders (7d)" value={numberFormat(kpis.orders7d || 0)} hint="Rolling week" />
          <StatCard label="Orders (30d)" value={numberFormat(kpis.orders30d || 0)} hint="Rolling month" />
          <StatCard label="Revenue" value={formatCurrency(kpis.revenue || 0)} hint="Gross" />
          <StatCard label="Average order value" value={formatCurrency(kpis.aov || 0)} hint="Per order" />
          <StatCard label="Avg prep time" value={`${kpis.prepTimeAvg || 0} min`} hint="Kitchen speed" />
        </div>

        <div className="insight-card wide">
          <div className="insight-head">
            <h4>Orders over time</h4>
            <span className="muted small">Trend for selected range</span>
          </div>
          {ordersSeries.length === 0 ? (
            <div className="empty-insight">No data yet.</div>
          ) : (
            <div className="line-area">
              {ordersSeries.map((point) => (
                <div key={point.label} className="line-area-bar">
                  <div
                    className="line-area-fill"
                    style={{ height: `${Math.max(6, (point.value / maxOrders) * 100)}%` }}
                  />
                  <span className="line-area-label">{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="insight-card">
          <div className="insight-head">
            <h4>Peak hours</h4>
            <span className="muted small">Orders by hour</span>
          </div>
          {peakHours.length ? (
            <MiniBars data={peakHours} />
          ) : (
            <div className="empty-insight">No hourly data.</div>
          )}
        </div>

        <div className="insight-card">
          <div className="insight-head">
            <h4>Status breakdown</h4>
          </div>
          <div className="chips-grid">
            {status.map((s) => (
              <div key={s.label} className="chip">
                <span
                  className="chip-dot"
                  style={{ background: statusColors[s.label] || "#0f172a" }}
                />
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-head">
            <h4>Device mix</h4>
            <span className="muted small">QR vs Waiter vs Admin</span>
          </div>
          {devices.length ? (
            devices.map((d) => <ProgressBar key={d.label} label={d.label} value={d.value} max={100} />)
          ) : (
            <div className="empty-insight">No device data.</div>
          )}
        </div>

        <TableList
          title="Top ordered items"
          rows={topItems}
          emptyLabel="No items yet."
          columns={[
            { key: "name", label: "Item" },
            { key: "orders", label: "Orders", render: numberFormat },
            { key: "revenue", label: "Revenue", render: formatCurrency }
          ]}
        />

        <TableList
          title="Viewed but not ordered"
          rows={viewedNotOrdered}
          emptyLabel="No attention gaps yet."
          columns={[
            { key: "name", label: "Item" },
            { key: "views", label: "Views", render: numberFormat },
            {
              key: "orders",
              label: "Orders",
              render: (value) => numberFormat(value || 0)
            }
          ]}
        />

        <TableList
          title="Least ordered items"
          rows={lowItems}
          emptyLabel="No data."
          columns={[
            { key: "name", label: "Item" },
            { key: "orders", label: "Orders", render: numberFormat },
            { key: "views", label: "Views", render: numberFormat }
          ]}
        />

        <TableList
          title="Orders by table"
          rows={tables}
          emptyLabel="No table data."
          columns={[
            { key: "table", label: "Table" },
            { key: "orders", label: "Orders", render: numberFormat },
            { key: "revenue", label: "Revenue", render: formatCurrency }
          ]}
        />

        <div className="insight-card">
          <div className="insight-head">
            <h4>Operational highlights</h4>
          </div>
          <div className="highlight-grid">
            <div className="highlight-tile">
              <p className="muted small">Avg kitchen prep time</p>
              <strong>{kpis.prepTimeAvg || 0} min</strong>
            </div>
            <div className="highlight-tile">
              <p className="muted small">Peak hour</p>
              <strong>{kpis.peakHour || "—"}</strong>
            </div>
            <div className="highlight-tile">
              <p className="muted small">Cancellation rate</p>
              <strong>{percentFormat(kpis.cancellationRate || 0)}</strong>
            </div>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-head">
            <h4>Privacy & consent</h4>
            <span className="muted small">Google Consent Mode v2</span>
          </div>
          <div className="consent-admin-grid">
            <div className="consent-admin-actions">
              <p className="muted small">Set consent state</p>
              <div className="consent-admin-buttons">
                <button className="primary-btn" type="button" onClick={() => updateConsent("accept_all")}>
                  Accept all
                </button>
                <button className="ghost-btn" type="button" onClick={() => updateConsent("analytics_only")}>
                  Analytics only
                </button>
                <button className="ghost-btn danger-btn" type="button" onClick={() => updateConsent("reject")}>
                  Reject
                </button>
                <button
                  className="outline-btn"
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("smart-consent-open"))}
                >
                  Show banner
                </button>
              </div>
            </div>
            <div className="consent-admin-copy">
              <p className="muted small">Customize banner copy (stored locally)</p>
              <div className="consent-copy-grid">
                {["en", "ru", "hy"].map((lang) => (
                  <div key={lang} className="consent-copy-card">
                    <strong>{lang.toUpperCase()}</strong>
                    <input
                      type="text"
                      placeholder="Title"
                      value={bannerCopy?.[lang]?.title || ""}
                      onChange={(e) =>
                        setBannerCopy((prev) => ({
                          ...prev,
                          [lang]: { ...(prev?.[lang] || {}), title: e.target.value }
                        }))
                      }
                    />
                    <textarea
                      rows={2}
                      placeholder="Body"
                      value={bannerCopy?.[lang]?.body || ""}
                      onChange={(e) =>
                        setBannerCopy((prev) => ({
                          ...prev,
                          [lang]: { ...(prev?.[lang] || {}), body: e.target.value }
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="consent-copy-actions">
                <button className="primary-btn" type="button" onClick={saveBannerCopy}>
                  Save copy
                </button>
                <button className="ghost-btn" type="button" onClick={resetBannerCopy}>
                  Reset to defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
