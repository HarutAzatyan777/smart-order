import { useState, useCallback } from "react";
import { API_BASE_URL } from "../utils/apiConfig";

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_BASE_URL}${endpoint}`;

      console.log(`API Request: ${options.method || "GET"} ${url}`);

      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(`API Success: ${url}`, data);
      return data;
    } catch (err) {
      console.error(`API Error:`, err.message);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};

export default useApi;
