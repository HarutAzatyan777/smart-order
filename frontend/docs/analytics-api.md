# Admin Analytics API design

## Phase 1 (GA4 Reporting API)
- Endpoint: `GET /admin/analytics/summary?range=1d|7d|30d&location=<optional>&restaurant_id=<optional>`
- Auth: Admin token (same as other admin APIs).
- Response shape (matches `AnalyticsPanel` expectations):
```json
{
  "range": "7d",
  "kpis": {
    "ordersToday": 86,
    "orders7d": 540,
    "orders30d": 2180,
    "revenue": 1840000,
    "aov": 34500,
    "peakHour": "19:00",
    "cancellationRate": 0.04,
    "prepTimeAvg": 11
  },
  "ordersOverTime": [{ "label": "Dec 1", "value": 80 }],
  "peakHours": [{ "label": "19:00", "value": 72 }],
  "statusBreakdown": [{ "label": "Delivered", "value": 318 }],
  "deviceBreakdown": [{ "label": "QR / Guest", "value": 62 }],
  "topItems": [{ "name": "Margherita Pizza", "orders": 182, "views": 340, "revenue": 980000 }],
  "lowItems": [{ "name": "Gazpacho", "orders": 9, "views": 68, "revenue": 42000 }],
  "viewedNotOrdered": [{ "name": "Truffle Fries", "views": 210, "orders": 24 }],
  "tables": [{ "table": "Patio 1", "orders": 42, "revenue": 280000 }]
}
```

### GA4 mappings
- Orders over time: GA4 `order_submitted` count by date (`eventName = 'order_submitted'`, filter `user_role` in {guest, waiter, admin}, dimension `date`).
- Revenue/AOV: `order_value` metric sum / avg on `order_submitted`.
- Device mix: use `user_role` + `device_type` dimensions.
- Peak hours: `order_submitted` by `hour`.
- Status breakdown: derive from kitchen events (`order_preparing`, `order_ready`, `order_delivered`) counts in window.
- Cancellation: `cancelled` orders or `order_submitted` minus `order_delivered`.
- Prep time: difference between `order_preparing` and `order_ready` timestamps (avg).
- Menu intelligence: `item_added` (orders) vs `item_viewed` (views). Conversion = `item_added / item_viewed`.

## Phase 2 (BigQuery)
- Use exported GA4 tables (`events_*`).
- Create views:
  - `order_funnel_daily`: counts per eventName per day with dimensions (restaurant_id, location, user_role, device_type, table_number).
  - `kitchen_prep_time`: avg/median duration between `order_preparing` and `order_ready`.
  - `menu_conversion`: views vs adds vs orders per item/category.
- Endpoint ideas:
  - `GET /admin/analytics/funnel?range=...`
  - `GET /admin/analytics/menu?range=...`
  - `GET /admin/analytics/kitchen?range=...`
- Cache: precompute daily tables and store in Firestore/Redis to avoid cold queries.

## Access control
- Require admin/owner token on every analytics endpoint.
- Optionally hide `revenue` and `aov` when a staff role is passed (enforce server-side).

## Notes
- Frontend falls back to mock data when API fails (see `getMockAnalytics`), so API can be rolled out gradually.
- Keep currency consistent with GA exports (currently AMD in UI helper). Adjust `formatCurrency` if currency changes.
