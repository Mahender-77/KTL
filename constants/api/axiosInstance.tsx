import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const LAST_ACTIVITY_KEY = "authLastActivityAt";

axiosInstance.interceptors.response.use(
  async (response) => {
    if (response.config.headers?.["Authorization"]) {
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    if (
      response.config.url?.includes("/products/public") &&
      !response.config.url?.includes("/public/")
    ) {
      const fromBackend = response.headers["x-ktl-backend"];
      console.log(
        "[API] Products response from KTL backend:",
        !!fromBackend,
        "| URL:",
        String(response.config.baseURL) + String(response.config.url),
      );
      if (!fromBackend) {
        console.warn(
          "[API] Response missing X-KTL-Backend header — request may be hitting a different server!",
        );
      }
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default axiosInstance;
