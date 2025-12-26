# GA4 setup for Smart Order (Production)

- Property: **Smart Order – Production** (GA4)
- Measurement ID: **G-0XZFHZ57HG** (override via `VITE_GA_MEASUREMENT_ID`)
- Defaults: analytics storage granted; ad_storage / ad_user_data / ad_personalization denied (Consent Mode v2). Currency falls back to USD unless `VITE_GA_CURRENCY` is set.
- Env knobs: `VITE_GA_MEASUREMENT_ID`, `VITE_GA_RESTAURANT_ID`, `VITE_GA_LOCATION`, `VITE_GA_CURRENCY`

## What was implemented (frontend)
- `src/utils/analytics.js`: gtag loader with manual page views, consent defaults, user properties, base params (`restaurant_id`, `location`, `user_role`, `table_number`, `device_type`, `currency`).
- `src/router/AppRouter.jsx`: SPA page views fired on route change; user_role inferred from path.
- Customer QR Menu: `src/pages/menu/menu.jsx` – menu_viewed, category_viewed, item_viewed, item_added, order_started.
- Waiter flow: `src/pages/waiter/WaiterSelectTable.jsx` (order_started), `src/pages/waiter/WaiterOrderCreate.jsx` (item_added, order_submitted), `src/pages/waiter/WaiterHome.jsx` (order_delivered).
- Kitchen: `src/pages/kitchen/KitchenDashboard.jsx` – order_preparing / order_ready / order_delivered when batches/items move status.

## Event map (all events include base params: restaurant_id, location, user_role, device_type, currency, table_number when known)
- `page_view`: on every route change (manual, SPA-safe).
- `menu_viewed`: menu data loaded (QR/guest). Params: `language`, `menu_count`, `category_count`.
- `category_viewed`: category switch on menu. Params: `category`, `category_label`.
- `item_viewed`: item detail opened (menu). Params: `item_id`, `item_name`, `category`, `price`, `language`.
- `item_added`: item added to cart/order (guest + waiter). Params: `item_id`, `item_name`, `category`, `price`, `quantity`, `order_value`, `waiter_name` (waiter app).
- `order_started`: first add/select in a flow (guest menu, waiter table selection/order build). Params: `order_value` (if known), `waiter_name`, `table_number`.
- `order_submitted` (conversion): waiter order sent. Params: `order_value`, `items_count`, `table_number`, `waiter_id`, `waiter_name`.
- `order_preparing`: kitchen moves batch/item to preparing. Params: `station`, `batch_id`/`item_id`, `item_name`, `quantity`, `table_number`, `chef_name`.
- `order_ready`: kitchen marks ready (same params as above).
- `order_delivered` (conversion): waiter delivers item or kitchen completes delivery. Params: `order_id`, `item_id`, `item_name`, `quantity`, `table_number`, `waiter_id`, `waiter_name`, `station`, `chef_name`.
- `payment_completed` (conversion, future): not emitted yet; reserve for payment success with `order_value`, `currency`, `table_number`.

## Custom dimensions/metrics to register in GA4
Create as **Event-scoped custom dimensions** unless noted:
- `restaurant_id`
- `location`
- `user_role`
- `device_type`
- `table_number`
- `waiter_id` (where present)
- `waiter_name`
- `chef_name`
- `station`
- `batch_id`
- `item_id`
- `item_name`
- `category`
- `quantity` (metric)
- `order_value` (metric, currency-aligned)

## Marked conversions (configure in GA UI)
- order_submitted
- order_delivered
- payment_completed (when enabled)

## Explorations / reports to build
1) Order funnel: menu_viewed → item_added → order_started → order_submitted → order_delivered. Breakdowns: user_role, device_type, table_number.  
2) Kitchen performance: order_preparing → order_ready → order_delivered with `station`, `chef_name`, `quantity`; add median/avg time between events.  
3) Peak hours: order_submitted by hour/day with location filter.  
4) Top items: item_added and order_submitted with `item_name`, `category`, `order_value`.  
5) Viewed vs not ordered: item_viewed vs item_added by item/category.

## BigQuery export (recommended)
- Link GA4 → BigQuery; enable daily export for the production property.
- Verify events appear in `events_*` tables; base params are under `event_params` and `user_properties`.
- Add scheduled views for funnel timing (e.g., ready minus preparing) for dashboarding.

## QA & Debug checklist
- Use GA4 DebugView with GTM/GA debugger on a staging browser profile.
- Validate per-surface:
  - QR Menu: menu_viewed, category_viewed, item_viewed, item_added fire with language + category; table_number populated when present in URL.
  - Waiter: order_started on table select; item_added and order_submitted carry waiter_name/id, table_number, order_value.
  - Kitchen: status moves emit order_preparing/ready/delivered with station + quantity.
  - Page views recorded for Waiter, Kitchen, Admin routes (SPA).
- Confirm conversions increment for order_submitted and order_delivered.
- Check that ad/personalization consents stay “denied” unless intentionally changed.

## Privacy/consent
- Consent Mode v2 initialized with analytics_storage granted, all ad storage denied.
- To wire a consent UI, call `gtag('consent', 'update', {...})` after user choice; base helper is in `src/utils/analytics.js`.
