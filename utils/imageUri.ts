import { Platform } from "react-native";

/**
 * Safe URL for React Native <Image source={{ uri }} /> — never pass "" (triggers WARN source.uri should not be an empty string).
 */
export function parseImageUri(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim();
  return u.length > 0 ? u : null;
}

function normalizeApiBaseUrl(raw: string): string {
  let n = raw.trim().replace(/\/$/, "");
  if (Platform.OS === "android" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(n)) {
    n = n.replace("localhost", "10.0.2.2").replace("127.0.0.1", "10.0.2.2");
  }
  return n;
}

/**
 * Same as {@link parseImageUri}, but prefixes `EXPO_PUBLIC_API_URL` for root-relative paths
 * (e.g. `/uploads/...`) so `<Image uri>` works on device.
 */
export function resolvePublicMediaUri(raw: unknown): string | null {
  const u = parseImageUri(raw);
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const rawBase = process.env.EXPO_PUBLIC_API_URL ?? "";
  const base = rawBase.trim() ? normalizeApiBaseUrl(rawBase) : "";
  if (u.startsWith("/") && base.length > 0) return `${base}${u}`;
  return u;
}
