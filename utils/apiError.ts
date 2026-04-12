import type { AxiosError } from "axios";

const DELIVERY_MESSAGES: Record<string, string> = {
  SUBORDER_UNAVAILABLE: "This delivery is no longer available or was taken by someone else.",
  SUBORDER_UNAUTHORIZED: "You are not allowed to perform this action on this delivery.",
  SUBORDER_NOT_FOUND: "Delivery not found or you do not have access.",
  SUBORDER_ACCESS_DENIED: "You do not have access to this delivery.",
  LOCATION_REQUIRED: "Location is required. Enable location services and try again.",
  MODULE_DISABLED: "Delivery is not enabled for this organization.",
  ORG_REQUIRED: "Organization context is missing. Sign in again.",
  ORG_MISMATCH: "Organization mismatch. Sign in again.",
  ORG_INACTIVE: "This organization is inactive.",
  SUBSCRIPTION_EXPIRED: "Subscription expired.",
  NO_TOKEN: "Session expired. Sign in again.",
  TOKEN_INVALID: "Session invalid. Sign in again.",
  TOKEN_EXPIRED: "Session expired. Sign in again.",
};

/**
 * User-facing message for failed API calls (axios or unknown).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const ax = error as AxiosError<{ message?: string; errorCode?: string }>;
    const code = ax.response?.data?.errorCode;
    if (code && DELIVERY_MESSAGES[code]) return DELIVERY_MESSAGES[code];
    const msg = ax.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error instanceof Error && error.message === "Network Error") {
    return "No network connection. Check your internet and try again.";
  }
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: string }).message;
    if (m === "Network Error") return "No network connection. Check your internet and try again.";
  }
  return fallback;
}
