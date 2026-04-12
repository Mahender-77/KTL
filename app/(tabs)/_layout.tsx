import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#888",
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          // Ensure tapping Home always takes you to the Home screen
          href: "/(tabs)",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          href: null, // Hide from tab bar but keep accessible via navigation
          tabBarStyle: { display: "none" }, // Hide tab bar on cart page
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
  name="wishlist"
  options={{
    title: "Wishlist",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="heart-outline" size={size} color={color} />
    ),
  }}
/>

    </Tabs>
  );
}
