// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/constants/colors";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "@/constants/api/axiosInstance";


function RootNavigation() {
  const { isAuthenticated, loading } = useAuth();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(true);
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (isAuthenticated) {
        try {
          const token = await AsyncStorage.getItem("accessToken");
          if (token) {
            axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            const response = await axiosInstance.get("/api/auth/me");
            const role = response.data.role || "user";
            setUserRole(role);
            
            // Redirect based on role if on wrong screen
            const inAuthGroup = segments[0] === "(auth)";
            const inDeliveryGroup = segments[0] === "(delivery)";
            const inTabsGroup = segments[0] === "(tabs)";
            
            // Admin and user are treated the same - both go to tabs
            const isUserOrAdmin = role === "user" || role === "admin";
            
            if (role === "delivery" && !inDeliveryGroup && !inAuthGroup) {
              router.replace("/(delivery)/dashboard");
            } else if (isUserOrAdmin && !inTabsGroup && !inAuthGroup && !inDeliveryGroup && segments[0] !== "orders" && segments[0] !== "checkout" && segments[0] !== "product") {
              router.replace("/(tabs)");
            }
          }
        } catch (error) {
          console.log("Failed to fetch user role:", error);
          setUserRole("user");
        } finally {
          setRoleLoading(false);
        }
      } else {
        setRoleLoading(false);
      }
    };
    checkUserRole();
  }, [isAuthenticated, segments]);

  if (loading || roleLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Always include all route groups */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(delivery)" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="product" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <RootNavigation />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
