import axios from "axios";
import { getAccessToken, touchLastActivity } from "@/constants/authTokenStorage";
import { Platform } from "react-native";
import Constants from "expo-constants";

function normalizeBaseUrl(raw: string): string {
  let normalized = raw.trim().replace(/\/$/, "");
  if (Platform.OS === "android" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    normalized = normalized.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
  }
  return normalized;
}

function deriveApiBaseUrlFromExpoHost(): string | null {
  const c = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    manifest?: { debuggerHost?: string };
  };
  const hostWithPort =
    c.expoConfig?.hostUri ??
    c.expoGoConfig?.debuggerHost ??
    c.manifest2?.extra?.expoGo?.debuggerHost ??
    c.manifest?.debuggerHost ??
    "";
  if (!hostWithPort) return null;
  const host = hostWithPort.split(":")[0]?.trim();
  if (!host) return null;
  return `http://${host}:5000`;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }

  const fromExpoHost = deriveApiBaseUrlFromExpoHost();
  if (fromExpoHost) {
    return normalizeBaseUrl(fromExpoHost);
  }

  throw new Error(
    "EXPO_PUBLIC_API_URL is not set and Expo host fallback failed. Set Ktl/.env EXPO_PUBLIC_API_URL."
  );
}

let resolvedBaseUrl: string | undefined = undefined;
try {
  resolvedBaseUrl = resolveApiBaseUrl();
} catch (err) {
  console.error("[api] failed to resolve EXPO_PUBLIC_API_URL; requests may fail", err);
  resolvedBaseUrl = undefined;
}

const axiosInstance = axios.create({
  baseURL: resolvedBaseUrl,
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
