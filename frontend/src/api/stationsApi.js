import api from "./axios";

export const fetchKitchenStations = () =>
  api.get("/kitchen/stations");

export const fetchStationQueue = (slug, params = {}) =>
  api.get(`/kitchen/stations/${slug}/queue`, { params });

export const updateStationItemsStatus = (slug, payload) =>
  api.patch(`/kitchen/stations/${slug}/items/status`, payload);

export const claimStationItems = (slug, payload) =>
  api.patch(`/kitchen/stations/${slug}/items/claim`, payload);

export const unclaimStationItems = (slug, payload) =>
  api.patch(`/kitchen/stations/${slug}/items/unclaim`, payload);

export const fetchStationMetrics = (slug) =>
  api.get(`/kitchen/stations/${slug}/metrics`);

export const deliverOrderItem = (orderId, itemId) =>
  api.patch(`/waiter/${orderId}/items/${itemId}/deliver`);

// Admin operations
const withToken = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export const adminFetchStations = (token, params = {}) =>
  api.get("/admin/stations", {
    params: { includeInactive: true, ...(params || {}) },
    ...withToken(token)
  });

export const adminCreateStation = (payload, token) =>
  api.post("/admin/stations", payload, withToken(token));

export const adminUpdateStation = (id, payload, token) =>
  api.put(`/admin/stations/${id}`, payload, withToken(token));

export const adminDeleteStation = (id, payload = {}, token) =>
  api.delete(`/admin/stations/${id}`, { data: payload, ...withToken(token) });

export const adminFetchRouting = (token) =>
  api.get("/admin/stations/routing/map", withToken(token));

export const adminSaveRouting = (payload, token) =>
  api.put("/admin/stations/routing/map", payload, withToken(token));
