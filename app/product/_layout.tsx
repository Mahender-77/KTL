
// app/product/_layout.tsx
import { Stack } from "expo-router";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

export default function ProductLayout() {
  return (
    <Stack
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        animationMatchesGesture: false,
        freezeOnBlur: false,
      })}
    />
  );
}