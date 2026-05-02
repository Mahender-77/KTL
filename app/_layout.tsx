// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Loader from "@/components/common/Loader";
import { FeedbackProvider, useFeedback } from "@/context/FeedbackContext";
import { handleNotificationReceived, handleNotificationResponse } from "@/services/pushNotifications";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

SplashScreen.preventAutoHideAsync();

function PushNotificationListeners() {
  const { showToast, hideToast } = useFeedback();
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      } catch (err) {
        console.error("[push] setNotificationChannelAsync failed", err);
      }
    })();
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          ...(Platform.OS === "android"
            ? { priority: Notifications.AndroidNotificationPriority.MAX }
            : {}),
        }),
      });
    } catch (err) {
      console.error("[push] setNotificationHandler failed", err);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
  
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      // 🔥 DEBUG LOG (VERY IMPORTANT)
      try {
        console.log("🔥 RECEIVED:", {
          title: notification?.request?.content?.title ?? "",
          body: notification?.request?.content?.body ?? "",
          data: notification?.request?.content?.data ?? {},
        });
      } catch {
        /* no-op */
      }
  
      void (async () => {
        try {
          const payload = await handleNotificationReceived(notification);
          // Optional debug log for payload
          console.log("📦 Parsed Payload:", payload);

          showToast({
            variant: "info",
            title: payload.title || "Notification",
            message: payload.body || payload.title || "You have a new update.",
            duration: 4000,
            actionLabel: "Dismiss",
            onAction: () => hideToast(),
          });
        } catch (err) {
          console.error("[push] notification received handling failed", err);
        }
      })();
    });
  
    return () => {
      receivedSub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
  
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        console.log("👉 NOTIFICATION TAPPED:", response?.notification?.request?.content?.data);
      } catch {
        /* no-op */
      }
      try {
        handleNotificationResponse(response);
      } catch (err) {
        console.error("[push] notification response handling failed", err);
      }
    });
  
    void (async () => {
      try {
        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse) {
          console.log(
            "🚀 APP OPENED FROM NOTIFICATION:",
            initialResponse.notification.request.content.data
          );
          handleNotificationResponse(initialResponse);
        }
      } catch (err) {
        console.error("[push] getLastNotificationResponseAsync failed", err);
      }
    })();
  
    return () => {
      responseSub.remove();
    };
  }, []);
  return null;
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
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnMount: false,
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <PushNotificationListeners />
                <RootNavigation />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </FeedbackProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
