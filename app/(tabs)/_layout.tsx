// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, type TextStyle, type ViewStyle, Platform } from "react-native";
import { colors } from "@/constants/colors";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}) {
  return (
    <View style={[tab.iconWrap, focused && tab.iconWrapActive]}>
      <Ionicons name={name as any} size={size - 2} color={color} />
    </View>
  );
}

const tab = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "#EEF2FF" },
});

const tabBarLabelStyle: TextStyle = {
  fontSize: 10,
  fontWeight: "700",
  marginTop: 2,
};

const tabBarStyle: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  borderTopWidth: 1,
  borderTopColor: "#EAEDF2",
  height: 60,
  paddingBottom: Platform.OS === "android" ? 10 : 8,
  paddingTop: 6,
  elevation: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        // ── KEY FIX: position absolute prevents KeyboardAvoidingView from
        //    shrinking the tab bar on the home screen ──────────────────────
        tabBarStyle,
        tabBarLabelStyle,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: "/(tabs)",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? "heart" : "heart-outline"} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}