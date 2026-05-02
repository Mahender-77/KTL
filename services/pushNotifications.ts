import * as Notifications from "expo-notifications";
import type { Notification, NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";

const PUSH_REGISTRATION_TOKEN_KEY = "expo_push_registration_token";
const OTP_CACHE_KEY = "last_notification_otp";
let latestOtpFromNotification: string | null = null;

const useSecureForPush = Platform.OS === "ios" || Platform.OS === "android";

const ANDROID_DEFAULT_CHANNEL = "default";
export type PushProvider = "expo" | "fcm";

export type PushTokenPayload = {
  token: string;
  provider: PushProvider;
};

/**
 * Android 8+: required for notifications to show reliably. Call before getExpoPushTokenAsync.
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
      name: "Orders & updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Ask for notification permissions. On web, returns `"denied"` (no-op).
 */
async function requestFirebasePermissionIfAvailable(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const messagingMod = await import("@react-native-firebase/messaging");
    const messaging = messagingMod.default;
    await messaging().requestPermission();
  } catch {
    // Keep Expo permission as primary fallback.
  }
}

export async function requestPermission(): Promise<"granted" | "denied"> {
  if (Platform.OS === "web") return "denied";
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus === "granted") {
    await requestFirebasePermissionIfAvailable();
  }
  return finalStatus === "granted" ? "granted" : "denied";
}

/**
 * Expo push token for this device. On web, returns `null` (no-op).
 */
async function getFcmToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const messagingMod = await import("@react-native-firebase/messaging");
    const messaging = messagingMod.default;
    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    return token?.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export async function getPushToken(): Promise<PushTokenPayload | null> {
  if (Platform.OS === "web") return null;
  try {
    const fcmToken = await getFcmToken();
    if (fcmToken) {
      return { token: fcmToken, provider: "fcm" };
    }
    await ensureAndroidNotificationChannel();
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenResponse =
      projectId != null && String(projectId).length > 0
        ? await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) })
        : await Notifications.getExpoPushTokenAsync();
    const expoToken = tokenResponse.data ?? null;
    if (!expoToken) return null;
    return { token: expoToken, provider: "expo" };
  } catch {
    return null;
  }
}

export async function getPushTokens(): Promise<PushTokenPayload[]> {
  if (Platform.OS === "web") return [];
  const out: PushTokenPayload[] = [];
  const seen = new Set<string>();

  const fcmToken = await getFcmToken();
  if (fcmToken && !seen.has(fcmToken)) {
    out.push({ token: fcmToken, provider: "fcm" });
    seen.add(fcmToken);
  }

  try {
    await ensureAndroidNotificationChannel();
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenResponse =
      projectId != null && String(projectId).length > 0
        ? await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) })
        : await Notifications.getExpoPushTokenAsync();
    const expoToken = tokenResponse.data?.trim();
    if (expoToken && !seen.has(expoToken)) {
      out.push({ token: expoToken, provider: "expo" });
    }
  } catch {
    // no-op; best effort
  }

  return out;
}

export async function getPushSubscriptionDiagnostics(): Promise<{
  platform: string;
  permission: string;
  hasExpoToken: boolean;
  hasFcmToken: boolean;
}> {
  if (Platform.OS === "web") {
    return {
      platform: "web",
      permission: "denied",
      hasExpoToken: false,
      hasFcmToken: false,
    };
  }
  const permissions = await Notifications.getPermissionsAsync();
  const fcmToken = await getFcmToken();
  const pushToken = await getPushToken();
  return {
    platform: Platform.OS,
    permission: permissions.status,
    hasExpoToken: Boolean(pushToken?.provider === "expo" && pushToken.token),
    hasFcmToken: Boolean(fcmToken),
  };
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
  if (__DEV__) {
    console.log("[push][received]", { title, body, data });
  }
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
  const screen = typeof data.screen === "string" ? data.screen : "";
  const type = typeof data.type === "string" ? data.type : "";
  if (__DEV__) {
    console.log("[push][tap]", {
      title: response.notification.request.content.title ?? "",
      body: response.notification.request.content.body ?? "",
      data,
    });
  }

  if (screen === "orders") {
    router.push("/orders");
    return;
  }
  if (screen === "delivery/available-orders") {
    router.push("/(delivery)/dashboard");
    return;
  }

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

  if (
    type === "delivery_order_available" ||
    type === "delivery_order_taken" ||
    type === "delivery_assigned"
  ) {
    router.push("/(delivery)/dashboard");
    return;
  }

  if (type === "otp") {
    router.push("/orders");
    return;
  }

  router.push("/orders");
}
