import { getExpoPushTokenAsync } from "expo-notifications/build/getExpoPushTokenAsync";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import type { Notification, NotificationResponse } from "expo-notifications/build/Notifications.types";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";

const PUSH_REGISTRATION_TOKEN_KEY = "expo_push_registration_token";
const OTP_CACHE_KEY = "last_notification_otp";
let latestOtpFromNotification: string | null = null;

const useSecureForPush = Platform.OS === "ios" || Platform.OS === "android";

/**
 * Ask for notification permissions. On web, returns `"denied"` (no-op).
 */
export async function requestPermission(): Promise<"granted" | "denied"> {
  if (Platform.OS === "web") return "denied";
  const { status: existing } = await getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted" ? "granted" : "denied";
}

/**
 * Expo push token for this device. On web, returns `null` (no-op).
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenResponse =
      projectId != null && String(projectId).length > 0
        ? await getExpoPushTokenAsync({ projectId: String(projectId) })
        : await getExpoPushTokenAsync();
    return tokenResponse.data ?? null;
  } catch {
    return null;
  }
}

/** Persist last registered Expo push token (SecureStore on native; not used on web). */
export async function persistPushRegistrationToken(token: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (useSecureForPush) {
    await SecureStore.setItemAsync(PUSH_REGISTRATION_TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(PUSH_REGISTRATION_TOKEN_KEY, token);
  }
}

export async function getPersistedPushRegistrationToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (useSecureForPush) {
    return SecureStore.getItemAsync(PUSH_REGISTRATION_TOKEN_KEY);
  }
  return AsyncStorage.getItem(PUSH_REGISTRATION_TOKEN_KEY);
}

export async function clearPersistedPushRegistrationToken(): Promise<void> {
  if (Platform.OS === "web") return;
  if (useSecureForPush) {
    try {
      await SecureStore.deleteItemAsync(PUSH_REGISTRATION_TOKEN_KEY);
    } catch {
      /* no-op */
    }
  } else {
    await AsyncStorage.removeItem(PUSH_REGISTRATION_TOKEN_KEY);
  }
}

export function extractOtpFromText(text: string): string | null {
  const match = text.match(/\b(\d{4,8})\b/);
  return match?.[1] ?? null;
}

export async function handleNotificationReceived(
  notification: Notification
): Promise<{ title: string; body: string; data: Record<string, unknown> }> {
  const title = notification.request.content.title ?? "Notification";
  const body = notification.request.content.body ?? "";
  const data = (notification.request.content.data ?? {}) as Record<string, unknown>;
  const otp = typeof data.otp === "string" ? data.otp : extractOtpFromText(body);
  if (otp) {
    latestOtpFromNotification = otp;
    await AsyncStorage.setItem(OTP_CACHE_KEY, otp);
  }
  return { title, body, data };
}

export async function getLatestOtpFromNotification(): Promise<string | null> {
  if (latestOtpFromNotification) return latestOtpFromNotification;
  latestOtpFromNotification = await AsyncStorage.getItem(OTP_CACHE_KEY);
  return latestOtpFromNotification;
}

export async function clearLatestOtpFromNotification(): Promise<void> {
  latestOtpFromNotification = null;
  await AsyncStorage.removeItem(OTP_CACHE_KEY);
}

export function handleNotificationResponse(
  response: NotificationResponse
): void {
  const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
  const orderId = typeof data.orderId === "string" ? data.orderId : undefined;
  const subOrderId = typeof data.subOrderId === "string" ? data.subOrderId : undefined;
  const type = typeof data.type === "string" ? data.type : "";

  if (subOrderId) {
    router.push({
      pathname: "/(delivery)/suborder/[id]",
      params: { id: subOrderId },
    } as unknown as Href);
    return;
  }

  if (orderId && type.startsWith("order_")) {
    router.push("/orders");
    return;
  }

  if (type === "otp") {
    router.push("/(auth)/login");
    return;
  }

  router.push("/orders");
}
