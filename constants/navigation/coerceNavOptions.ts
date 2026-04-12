import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * react-native-screens' Android RNSScreenManagerDelegate casts many props with `(boolean) value`.
 * Some code paths (restored state, deep links, React Compiler, or tooling) can stringify booleans as "true"/"false".
 * Coerce those so native never receives strings for boolean props.
 */
const NAV_BOOLEAN_KEYS = new Set<keyof NativeStackNavigationOptions | string>([
  "gestureEnabled",
  "animationMatchesGesture",
  "freezeOnBlur",
  "headerShown",
  "headerShadowVisible",
  "headerTransparent",
  "headerLargeTitle",
  "headerLargeTitleEnabled",
  "headerLargeTitleShadowVisible",
  "headerBackVisible",
  "headerBackButtonMenuEnabled",
  "fullScreenGestureEnabled",
  "fullScreenGestureShadowEnabled",
  "autoHideHomeIndicator",
  "keyboardHandlingEnabled",
  "statusBarHidden",
  "statusBarTranslucent",
  "navigationBarHidden",
  "navigationBarTranslucent",
  /** expo-router internal — must stay boolean if present */
  "internal_gestureEnabled",
  // Bottom tabs (HeaderOptions overlap with stack)
  "tabBarShowLabel",
  "tabBarHideOnKeyboard",
  "tabBarAllowFontScaling",
  "lazy",
  "popToTopOnBlur",
]);

function coerceEntry(key: string, value: unknown): unknown {
  if (!NAV_BOOLEAN_KEYS.has(key)) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/** Use for Stack / Tabs screenOptions and Stack.Screen options objects. */
export function coerceNavBooleanOptions<T extends Record<string, unknown>>(options: T): T {
  const out = { ...options } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    out[key] = coerceEntry(key, out[key]);
  }
  return out as T;
}

/** @deprecated use coerceNavBooleanOptions */
export function coerceNativeStackOptions<T extends Partial<NativeStackNavigationOptions>>(
  options: T
): T {
  return coerceNavBooleanOptions(options as Record<string, unknown>) as T;
}
