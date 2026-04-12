// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        animationMatchesGesture: false,
        freezeOnBlur: false,
      })}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}