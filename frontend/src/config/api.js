const LOCAL_API_BASE = "http://localhost:5001/swift-stack-444307-m4/us-central1/api";
const PROD_API_BASE = "https://api-qjjvzkr5nq-uc.a.run.app/api";

const normalizeBase = (url) => String(url || "").replace(/\/+$/, "");

const resolveBase = () => {
  if (import.meta?.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  return import.meta?.env?.DEV ? LOCAL_API_BASE : PROD_API_BASE;
};

export const API_BASE_URL = normalizeBase(resolveBase());

export const apiUrl = (path = "") => {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
};
