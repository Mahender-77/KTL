// constants/api/axiosInstance.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IMPORTANT: Set this to the machine running your API server.
// - Physical device: use your computer's local IP (e.g. 192.168.x.x:5000)
// - Android emulator: use 10.0.2.2:5000
// If you see 404 on login/cart/wishlist, the app cannot reach the server — check this URL.
const BASE_URL = "http://192.168.88.14:5000";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Attach token to every request automatically ───────────────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Debug: Log response headers to verify backend is hit (check for X-KTL-Backend)
axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/products/public") && !response.config.url?.includes("/public/")) {
      const fromBackend = response.headers["x-ktl-backend"];
      console.log("[API] Products response from KTL backend:", !!fromBackend, "| URL:", response.config.baseURL + response.config.url);
      if (!fromBackend) {
        console.warn("[API] Response missing X-KTL-Backend header — request may be hitting a different server!");
      }
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;