/**
 * API Configuration
 * Detects environment and returns appropriate API base URL
 */

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isLocalhost && isDevelopment) {
    // Local emulator development
    return "http://localhost:5001/swift-stack-444307-m4/us-central1/api";
  }

  if (isLocalhost) {
    // Local production build
    return "http://localhost:5001/swift-stack-444307-m4/us-central1/api";
  }

  // Production deployment
  return "https://us-central1-swift-stack-444307-m4.cloudfunctions.net/api";
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Tables
  tables: {
    getAll: `${API_BASE_URL}/tables`,
    create: `${API_BASE_URL}/tables`,
    update: (id) => `${API_BASE_URL}/tables/${id}`,
    delete: (id) => `${API_BASE_URL}/tables/${id}`,
  },
  // QR Codes
  qr: {
    get: (tableId) => `${API_BASE_URL}/tables/${tableId}/qr`,
    regenerate: (tableId) =>
      `${API_BASE_URL}/tables/${tableId}/qr/regenerate`,
    batchGenerate: `${API_BASE_URL}/tables/qr/batch-generate`,
  },
};

export default API_BASE_URL;
