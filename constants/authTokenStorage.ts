import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/** Same keys as legacy AsyncStorage usage — migration moves values to SecureStore on native. */
export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const LAST_ACTIVITY_KEY = "authLastActivityAt";

const MIGRATION_FLAG = "__ktl_secure_tokens_migrated_v1";

const useSecureForTokens = Platform.OS === "ios" || Platform.OS === "android";

async function getTokenFromStore(key: string): Promise<string | null> {
  if (useSecureForTokens) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setTokenInStore(key: string, value: string): Promise<void> {
  if (useSecureForTokens) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function deleteTokenFromStore(key: string): Promise<void> {
  if (useSecureForTokens) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* no-op */
    }
  } else {
    await AsyncStorage.removeItem(key);
  }
}

/**
 * REQ-38: move access/refresh from plain AsyncStorage → SecureStore once on iOS/Android.
 */
export async function migrateLegacyTokensOnce(): Promise<void> {
  if (!useSecureForTokens) {
    return;
  }
  const done = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (done === "1") {
    return;
  }

  const legacyAccess = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const legacyRefresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  const secureAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null);
  const secureRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);

  if (legacyAccess && !secureAccess) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyAccess);
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (legacyRefresh && !secureRefresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  await AsyncStorage.setItem(MIGRATION_FLAG, "1");
}

export async function getAccessToken(): Promise<string | null> {
  return getTokenFromStore(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getTokenFromStore(REFRESH_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await setTokenInStore(ACCESS_TOKEN_KEY, token);
}

export async function setRefreshToken(token: string): Promise<void> {
  await setTokenInStore(REFRESH_TOKEN_KEY, token);
}

export async function removeAccessToken(): Promise<void> {
  await deleteTokenFromStore(ACCESS_TOKEN_KEY);
}

export async function removeRefreshToken(): Promise<void> {
  await deleteTokenFromStore(REFRESH_TOKEN_KEY);
}

export async function touchLastActivity(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export async function removeLastActivity(): Promise<void> {
  await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
}

export async function clearSessionTokens(): Promise<void> {
  await removeAccessToken();
  await removeRefreshToken();
  await removeLastActivity();
}
