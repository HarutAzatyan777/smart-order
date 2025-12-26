# Consent Mode v2 implementation (Smart Order)

- Default state: all denied (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`).
- Loader: `src/utils/analytics.js` boots `gtag`/`dataLayer`, sends `consent default` before GA loads, applies stored choice, then loads GA4 (`send_page_view` disabled for SPA).
- Storage: localStorage key `smart-order-consent-v2` with `{ choice, updatedAt }`.
- UI: `src/components/ConsentBanner.jsx` (mounted globally in `App.jsx`).
  - Buttons: Accept all, Analytics only, Reject.
  - Languages: EN / RU / HY; auto-detected with manual switcher.
  - Manage button always available (bottom-right) to reopen.
  - Custom copy stored in `smart-consent-banner-copy` (per language `title`/`body`), editable in Admin → Analytics → Privacy card.
- Admin controls: In Analytics panel, admins can set consent state, open banner, and edit banner copy (local override).

## Consent payloads
- Accept all: all four signals `granted`.
- Analytics only: `analytics_storage: granted`; ads signals `denied`.
- Reject: all `denied`.

## How to QA
1) Load app in a fresh session → banner appears with all denied by default.
2) Pick “Analytics only” → banner hides, consent updates to granted for analytics only.
3) Use “Privacy settings” button to reopen and change state; verify stored choice persists reload.
4) GA4 DebugView: confirm events arrive with consented state; no GA consent warnings.
5) For Admin testing, open Analytics panel → Privacy card → trigger consent states and “Show banner.”

## Future hooks
- Policy link currently points to `/privacy` (stub).
- Ads toggles are denied by default; flip `updateConsent("accept_all")` when ads are enabled in future.
