// app/(delivery)/dashboard.tsx
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import axiosInstance from "@/constants/api/axiosInstance";
import { getAccessToken } from "@/constants/authTokenStorage";
import AvailableOrdersScreen from "./available-orders";
import { getApiErrorMessage } from "@/utils/apiError";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import type { AvailableOrder } from "./available-orders";

type DeliveryOrderRow = {
  _id: string;
  user?: { name?: string };
  address?: { address?: string; city?: string };
  deliveryStatus?: string;
};

function logDeliveryApiError(tag: string, error: unknown) {
  const e = error as {
    message?: string;
    response?: { status?: number; data?: unknown };
    config?: { method?: string; url?: string; baseURL?: string };
  };
  console.log(`[delivery-dashboard] ${tag}`, {
    message: e?.message,
    status: e?.response?.status,
    data: e?.response?.data,
    method: e?.config?.method,
    url: e?.config?.url,
    baseURL: e?.config?.baseURL,
  });
}

function getDeliveryStatusConfig(status?: string) {
  switch (status) {
    case "assigned":
      return { color: "#D97706", bg: "#FFFBEB", label: "Assigned" };
    case "accepted":
      return { color: colors.primary, bg: "#EEF2FF", label: "Accepted" };
    case "in-transit":
    case "out_for_delivery":
      return { color: colors.primary, bg: "#EEF2FF", label: "In Transit" };
    case "delivered":
      return { color: colors.success, bg: "#F0FDF4", label: "Delivered" };
    default:
      return { color: colors.textMuted, bg: "#F4F6F9", label: status ?? "Unknown" };
  }
}

type MyDeliveryCardProps = {
  order: DeliveryOrderRow;
  isUpdating: boolean;
  onMarkPickedUp: (orderId: string) => void;
  onSendOtp: (orderId: string) => void;
  onConfirmDelivery: (orderId: string, otp: string) => void;
};

const MyDeliveryCard = memo(function MyDeliveryCard({
  order,
  isUpdating,
  onMarkPickedUp,
  onSendOtp,
  onConfirmDelivery,
}: MyDeliveryCardProps) {
  const [otpValue, setOtpValue] = useState("");
  const statusCfg = getDeliveryStatusConfig(order.deliveryStatus);
  const canMarkPickedUp = order.deliveryStatus === "assigned" || order.deliveryStatus === "accepted";
  const canSendOtp = order.deliveryStatus === "out_for_delivery";
  const canConfirmDelivery = order.deliveryStatus === "out_for_delivery";

  return (
    <View style={s.deliveryCard}>
      <View style={s.deliveryCardTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.deliveryCustomerTitle}>{order.user?.name?.trim() || "Customer"}</Text>
          <Text style={s.deliveryCustomerSub}>Your delivery</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
          <Text style={[s.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={s.deliveryAddressRow}>
        <View style={s.deliveryAddressIcon}>
          <Ionicons name="location" size={13} color={colors.primary} />
        </View>
        <Text style={s.deliveryAddress} numberOfLines={2}>
          {[order.address?.address, order.address?.city].filter(Boolean).join(", ") || "Address unavailable"}
        </Text>
      </View>

      <View style={s.flowRow}>
        {["assigned", "picked up", "in transit", "delivered"].map((step, i, arr) => (
          <View key={step} style={s.flowStep}>
            <View style={s.flowDot} />
            <Text style={s.flowLabel}>{step}</Text>
            {i < arr.length - 1 && <View style={s.flowLine} />}
          </View>
        ))}
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnOutline]}
          disabled={isUpdating || !canSendOtp}
          onPress={() => {
            if (!canSendOtp) {
              Alert.alert("Pickup required", "Mark this order as picked up before sending OTP.");
              return;
            }
            onSendOtp(order._id);
          }}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="send-outline" size={14} color={colors.primary} />
              <Text style={s.actionBtnOutlineText}>Send OTP</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnPrimary]}
          disabled={isUpdating || !canMarkPickedUp}
          onPress={() => {
            if (!canMarkPickedUp) return;
            onMarkPickedUp(order._id);
          }}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={14} color="#fff" />
              <Text style={s.actionBtnPrimaryText}>Mark Picked Up</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.otpRow}>
        <TextInput
          placeholder="Enter customer OTP"
          placeholderTextColor={colors.textMuted}
          value={otpValue}
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setOtpValue}
          style={s.otpInput}
        />
        <TouchableOpacity
          style={[s.otpConfirmBtn, isUpdating && { opacity: 0.6 }]}
          disabled={isUpdating || !canConfirmDelivery}
          onPress={() => {
            if (!canConfirmDelivery) {
              Alert.alert("OTP required", "Send OTP after pickup, then confirm delivery.");
              return;
            }
            onConfirmDelivery(order._id, otpValue);
            setOtpValue("");
          }}
          activeOpacity={0.85}
        >
          <Text style={s.otpConfirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DeliveryDashboard() {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "my">("available");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const fetchAvailableOrders = useCallback(async (): Promise<AvailableOrder[]> => {
    let lat: number | undefined;
    let lng: number | undefined;
    if (lastCoordsRef.current) {
      lat = lastCoordsRef.current.lat;
      lng = lastCoordsRef.current.lng;
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          lastCoordsRef.current = { lat, lng };
        }
      } catch {
        // Non-blocking: still fetch without coords.
      }
    }
    const res = await axiosInstance.get("/api/orders/available", {
      params: lat != null && lng != null ? { lat, lng } : undefined,
    });
    return Array.isArray(res.data?.data) ? (res.data.data as AvailableOrder[]) : [];
  }, []);

  const fetchMyDeliveries = useCallback(async (): Promise<DeliveryOrderRow[]> => {
    const res = await axiosInstance.get("/api/orders/my-deliveries");
    return Array.isArray(res.data?.data) ? (res.data.data as DeliveryOrderRow[]) : [];
  }, []);

  const availableQuery = useQuery({
    queryKey: ["delivery", "available-orders"],
    queryFn: fetchAvailableOrders,
    enabled: isFocused,
    staleTime: 60_000,
    refetchInterval: isFocused && activeTab === "available" ? 60_000 : false,
  });

  const myQuery = useQuery({
    queryKey: ["delivery", "my-deliveries"],
    queryFn: fetchMyDeliveries,
    enabled: isFocused,
    staleTime: 60_000,
    refetchInterval: isFocused && activeTab === "my" ? 60_000 : false,
  });

  const availableOrders = availableQuery.data ?? [];
  const myDeliveries = myQuery.data ?? [];
  const loadingAvailable = availableQuery.isLoading;
  const refreshingAvailable = availableQuery.isRefetching && !availableQuery.isLoading;
  const loadingMy = myQuery.isLoading;
  const refreshingMy = myQuery.isRefetching && !myQuery.isLoading;

  const refreshAvailablePull = useCallback(() => {
    lastCoordsRef.current = null;
    void availableQuery.refetch();
  }, [availableQuery]);

  const refreshMyPull = useCallback(() => {
    void myQuery.refetch();
  }, [myQuery]);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      if (!isFocused) return;
      const token = await getAccessToken();
      const baseUrl = axiosInstance.defaults.baseURL;
      if (!mounted || !token || !baseUrl) return;

      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = io(baseUrl, {
        transports: ["websocket"],
        auth: { token },
      });

      socketRef.current.on("delivery:new-order-available", () => {
        // Payload only includes orderId; refetch immediately to hydrate full card details.
        void queryClient.invalidateQueries({ queryKey: ["delivery", "available-orders"] });
      });
      socketRef.current.on("delivery:order-accepted", (payload?: { orderId?: string; deliveryBoyId?: string }) => {
        const orderId = String(payload?.orderId ?? "");
        if (!orderId) return;

        queryClient.setQueryData<AvailableOrder[]>(["delivery", "available-orders"], (prev = []) =>
          prev.filter((o) => String(o._id) !== orderId)
        );

        const myId = String((user as { _id?: string } | null)?._id ?? "");
        if (myId && String(payload?.deliveryBoyId ?? "") === myId) {
          queryClient.setQueryData<DeliveryOrderRow[]>(["delivery", "my-deliveries"], (prev = []) => {
            const exists = prev.some((d) => String(d._id) === orderId);
            if (exists) return prev;
            return [
              {
                _id: orderId,
                user: { name: "Customer" },
                address: { address: "Assigned order" },
                deliveryStatus: "assigned",
              },
              ...prev,
            ];
          });
        }
      });
      socketRef.current.on("delivery:status-changed", (payload?: { orderId?: string; deliveryStatus?: string }) => {
        const orderId = String(payload?.orderId ?? "");
        const nextStatus = String(payload?.deliveryStatus ?? "");
        if (!orderId || !nextStatus) return;
        queryClient.setQueryData<DeliveryOrderRow[]>(["delivery", "my-deliveries"], (prev = []) =>
          prev.map((row) =>
            String(row._id) === orderId ? { ...row, deliveryStatus: nextStatus } : row
          )
        );
      });
    };
    void setup();

    return () => {
      mounted = false;
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isFocused, queryClient, user]);

  const acceptOrderWithOptimisticUpdate = useCallback(
    async (order: AvailableOrder) => {
      const availableKey = ["delivery", "available-orders"] as const;
      const myKey = ["delivery", "my-deliveries"] as const;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: availableKey }),
        queryClient.cancelQueries({ queryKey: myKey }),
      ]);

      const previousAvailable = queryClient.getQueryData<AvailableOrder[]>(availableKey) ?? [];
      const previousMy = queryClient.getQueryData<DeliveryOrderRow[]>(myKey) ?? [];

      const alreadyInMy = previousMy.some((d) => String(d._id) === String(order._id));
      const optimisticMyRow: DeliveryOrderRow = {
        _id: order._id,
        user: { name: "Customer" },
        address: { address: order.deliveryAddress },
        deliveryStatus: "assigned",
      };

      queryClient.setQueryData<AvailableOrder[]>(
        availableKey,
        previousAvailable.filter((o) => String(o._id) !== String(order._id))
      );
      queryClient.setQueryData<DeliveryOrderRow[]>(
        myKey,
        alreadyInMy ? previousMy : [optimisticMyRow, ...previousMy]
      );

      try {
        await axiosInstance.post(`/api/orders/${order._id}/accept`);
        // Don't block button loader on list refetch; refresh in background.
        void queryClient.invalidateQueries({ queryKey: availableKey });
        void queryClient.invalidateQueries({ queryKey: myKey });
      } catch (error) {
        queryClient.setQueryData<AvailableOrder[]>(availableKey, previousAvailable);
        queryClient.setQueryData<DeliveryOrderRow[]>(myKey, previousMy);
        throw error;
      }
    },
    [queryClient]
  );

  const activeMyDeliveries = useMemo(
    () => myDeliveries.filter((o) => o.deliveryStatus !== "delivered"),
    [myDeliveries]
  );

  const markPickedUp = useCallback(async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/pickup`);
      await queryClient.invalidateQueries({ queryKey: ["delivery", "my-deliveries"] });
    } catch (error) {
      logDeliveryApiError(`POST /api/orders/${orderId}/pickup failed`, error);
      Alert.alert("Error", getApiErrorMessage(error, "Could not mark picked up."));
    } finally {
      setUpdatingId(null);
    }
  }, [queryClient]);

  const sendOtp = useCallback(async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/send-otp`);
      Alert.alert("OTP Sent", "OTP has been sent to the customer.");
    } catch (error) {
      logDeliveryApiError(`POST /api/orders/${orderId}/send-otp failed`, error);
      Alert.alert("Error", getApiErrorMessage(error, "Could not send OTP."));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const confirmDelivery = useCallback(async (orderId: string, otp: string) => {
    try {
      if (!otp || otp.length < 4) {
        Alert.alert("Enter OTP", "Please enter the OTP from the customer.");
        return;
      }
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/confirm-delivery`, { otp });
      await queryClient.invalidateQueries({ queryKey: ["delivery", "my-deliveries"] });
      Alert.alert("Delivered!", "Delivery has been confirmed successfully.");
    } catch (error) {
      logDeliveryApiError(`POST /api/orders/${orderId}/confirm-delivery failed`, error);
      Alert.alert("Error", getApiErrorMessage(error, "Could not confirm delivery."));
    } finally {
      setUpdatingId(null);
    }
  }, [queryClient]);

  return (
    <>
      <Stack.Screen
        options={coerceNavBooleanOptions({
          headerShown: false,
          animationMatchesGesture: false,
          freezeOnBlur: false,
        })}
      />
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={s.headerLeft}>
            <View style={s.headerIconWrap}>
              <Ionicons name="bicycle" size={16} color={colors.primary} />
            </View>
            <Text style={s.headerTitle}>Delivery Dashboard</Text>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ── Tab switcher ── */}
        <View style={s.tabWrap}>
          <TouchableOpacity
            style={[s.tab, activeTab === "available" && s.tabActive]}
            onPress={() => setActiveTab("available")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={14}
              color={activeTab === "available" ? colors.primary : colors.textMuted}
            />
            <Text style={[s.tabText, activeTab === "available" && s.tabTextActive]}>
              Available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === "my" && s.tabActive]}
            onPress={() => setActiveTab("my")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bicycle-outline"
              size={14}
              color={activeTab === "my" ? colors.primary : colors.textMuted}
            />
            <Text style={[s.tabText, activeTab === "my" && s.tabTextActive]}>
              My Deliveries
            </Text>
            {activeMyDeliveries.length > 0 && activeTab !== "my" && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{activeMyDeliveries.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <View style={s.tabPanels}>
          <View
            style={[s.tabPanel, activeTab !== "available" && s.tabPanelHidden]}
            pointerEvents={activeTab === "available" ? "auto" : "none"}
          >
            <AvailableOrdersScreen
              orders={availableOrders}
              loading={loadingAvailable}
              refreshing={refreshingAvailable}
              onManualRefresh={refreshAvailablePull}
              onAcceptOrder={acceptOrderWithOptimisticUpdate}
            />
          </View>
          <View
            style={[s.tabPanel, activeTab !== "my" && s.tabPanelHidden]}
            pointerEvents={activeTab === "my" ? "auto" : "none"}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.myContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingMy}
                  onRefresh={refreshMyPull}
                  tintColor={colors.primary}
                />
              }
            >
              {loadingMy ? (
                <View style={s.centerState}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={s.stateText}>Loading deliveries...</Text>
                </View>
              ) : activeMyDeliveries.length === 0 ? (
                <View style={s.centerState}>
                  <View style={s.emptyIconWrap}>
                    <Ionicons name="bicycle-outline" size={40} color={colors.primary} />
                  </View>
                  <Text style={s.emptyTitle}>No active deliveries</Text>
                  <Text style={s.emptySubtitle}>Switch to Available to pick up orders</Text>
                </View>
              ) : (
                activeMyDeliveries.map((order) => {
                  const isUpdating = updatingId === order._id;
                  return (
                    <MyDeliveryCard
                      key={order._id}
                      order={order}
                      isUpdating={isUpdating}
                      onMarkPickedUp={(id) => {
                        void markPickedUp(id);
                      }}
                      onSendOtp={(id) => {
                        void sendOtp(id);
                      }}
                      onConfirmDelivery={(id, otp) => {
                        void confirmDelivery(id, otp);
                      }}
                    />
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6F9" },
  /** Keep both tab roots mounted to avoid unmount + full refetch on every switch */
  tabPanels: { flex: 1, position: "relative" },
  tabPanel: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  tabPanelHidden: { display: "none" },

  // Header
  header: {
    backgroundColor: "#0F1923",
    paddingBottom: 14,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabWrap: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEDF2",
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },

  // My deliveries content
  myContent: {
    padding: 12,
    paddingBottom: 30,
    gap: 10,
    flexGrow: 1,
  },

  // States
  centerState: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  stateText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 8,
  },

  // Delivery card
  deliveryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  deliveryCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  deliveryCustomerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  deliveryCustomerSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Address
  deliveryAddressRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  deliveryAddressIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  deliveryAddress: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    fontWeight: "500",
  },

  // Flow
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  flowStep: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  flowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    marginBottom: 4,
  },
  flowLine: {
    position: "absolute",
    top: 4,
    left: "50%",
    right: "-50%",
    height: 1.5,
    backgroundColor: "#E8ECF0",
  },
  flowLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnOutline: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionBtnPrimaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnOutlineText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  // OTP
  otpRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  otpInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  otpConfirmBtn: {
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  otpConfirmText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});