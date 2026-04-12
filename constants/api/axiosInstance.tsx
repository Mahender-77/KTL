import axios from "axios";
import { getAccessToken, touchLastActivity } from "@/constants/authTokenStorage";

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!fromEnv) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Copy Ktl/.env.example to Ktl/.env and set EXPO_PUBLIC_API_URL (no trailing slash)."
    );
  }
  return fromEnv.replace(/\/$/, "");
}

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  async (response) => {
    if (response.config.headers?.["Authorization"]) {
      await touchLastActivity();
    }
    if (
      response.config.url?.includes("/products/public") &&
      !response.config.url?.includes("/public/")
    ) {
      const fromBackend = response.headers["x-ktl-backend"];
      if (!fromBackend) {
      }
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default axiosInstance;
