// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "expo-notifications/build/NotificationsEmitter";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import Loader from "@/components/common/Loader";
import Toast from "@/components/common/Toast";
import { handleNotificationReceived, handleNotificationResponse } from "@/services/pushNotifications";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

SplashScreen.preventAutoHideAsync();

function PushNotificationListeners() {
  const [bannerVisible, setBannerVisible] = React.useState(false);
  const [bannerMessage, setBannerMessage] = React.useState("");

  useEffect(() => {
    if (Platform.OS === "web") return;
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const receivedSub = addNotificationReceivedListener((notification) => {
      void (async () => {
        const payload = await handleNotificationReceived(notification);
        setBannerMessage(payload.body || payload.title);
        setBannerVisible(true);
      })();
    });

    return () => {
      receivedSub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const responseSub = addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  return (
    <Toast
      visible={bannerVisible}
      message={bannerMessage}
      actionLabel="View"
      onAction={() => setBannerVisible(false)}
      onDismiss={() => setBannerVisible(false)}
      duration={3500}
    />
  );
}

function RootNavigation() {
  const { isAuthenticated, loading, user } = useAuth();
  const [navigationReady, setNavigationReady] = React.useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  React.useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      setNavigationReady(true);
      return;
    }

    if (!user) {
      setNavigationReady(true);
      return;
    }

    const role = user.role ?? "user";
    const inAuthGroup = segments[0] === "(auth)";
    const inDeliveryGroup = segments[0] === "(delivery)";
    const inTabsGroup = segments[0] === "(tabs)";
    const isUserOrAdmin = role === "user" || role === "admin";

    if (role === "delivery" && !inDeliveryGroup && !inAuthGroup) {
      router.replace("/(delivery)/dashboard");
    } else if (
      isUserOrAdmin &&
      !inTabsGroup &&
      !inAuthGroup &&
      !inDeliveryGroup &&
      segments[0] !== "orders" &&
      segments[0] !== "checkout" &&
      segments[0] !== "product"
    ) {
      router.replace("/(tabs)");
    }

    setNavigationReady(true);
  }, [loading, isAuthenticated, user, segments, router]);

  const showLoader =
    loading || (isAuthenticated && Boolean(user) && !navigationReady);

  if (showLoader) {
    return <Loader variant="fullscreen" message="Loading..." />;
  }

  return (
    <Stack
      screenOptions={coerceNavBooleanOptions({
        headerShown: false,
        animationMatchesGesture: false,
        freezeOnBlur: false,
      })}
    >
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
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <PushNotificationListeners />
            <RootNavigation />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
