// app/(delivery)/_layout.tsx
import { Stack } from "expo-router";

export default function DeliveryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}

