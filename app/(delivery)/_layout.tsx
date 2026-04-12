// app/(delivery)/_layout.tsx
import { Stack } from "expo-router";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

export default function DeliveryLayout() {
  return (
    <Stack
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        animationMatchesGesture: false,
        freezeOnBlur: false,
      })}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="available-orders" />
      <Stack.Screen name="suborder/[id]" />
    </Stack>
  );
}

