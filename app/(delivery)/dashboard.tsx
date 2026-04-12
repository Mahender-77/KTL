// app/(delivery)/dashboard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import axiosInstance from "@/constants/api/axiosInstance";
import AvailableOrdersScreen from "./available-orders";
import { getApiErrorMessage } from "@/utils/apiError";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";

type DeliveryOrder = {
  _id: string;
  user?: { name?: string };
  address?: { address?: string; city?: string };
  deliveryStatus?: string;
};

export default function DeliveryDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"available" | "my">("available");
  const [myDeliveries, setMyDeliveries] = useState<DeliveryOrder[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadMyDeliveries = useCallback(async () => {
    try {
      setLoadingMy(true);
      const res = await axiosInstance.get("/api/orders/my-deliveries");
      setMyDeliveries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not load your deliveries."));
    } finally {
      setLoadingMy(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "my") {
      loadMyDeliveries();
    }
  }, [activeTab, loadMyDeliveries]);

  const activeMyDeliveries = useMemo(
    () => myDeliveries.filter((o) => o.deliveryStatus !== "delivered"),
    [myDeliveries]
  );

  const markPickedUp = useCallback(
    async (orderId: string) => {
      try {
        setUpdatingId(orderId);
        await axiosInstance.post(`/api/orders/${orderId}/pickup`);
        await loadMyDeliveries();
      } catch (error) {
        Alert.alert("Error", getApiErrorMessage(error, "Could not mark picked up."));
      } finally {
        setUpdatingId(null);
      }
    },
    [loadMyDeliveries]
  );

  const sendOtp = useCallback(async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/send-otp`);
      Alert.alert("OTP sent", "OTP has been sent to customer.");
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not send OTP."));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const confirmDelivery = useCallback(
    async (orderId: string) => {
      try {
        const otp = otpInputs[orderId];
        if (!otp || otp.length < 4) {
          Alert.alert("Enter OTP", "Please enter the customer OTP.");
          return;
        }
        setUpdatingId(orderId);
        await axiosInstance.post(`/api/orders/${orderId}/confirm-delivery`, { otp });
        setOtpInputs((prev) => ({ ...prev, [orderId]: "" }));
        await loadMyDeliveries();
        Alert.alert("Done", "Delivery confirmed.");
      } catch (error) {
        Alert.alert("Error", getApiErrorMessage(error, "Could not confirm delivery."));
      } finally {
        setUpdatingId(null);
      }
    },
    [loadMyDeliveries, otpInputs]
  );

  return (
    <>
      <Stack.Screen
        options={coerceNavBooleanOptions({
          headerShown: false,
          animationMatchesGesture: false,
          freezeOnBlur: false,
        })}
      />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Delivery Dashboard</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "available" && styles.tabBtnActive]}
            onPress={() => setActiveTab("available")}
          >
            <Text style={[styles.tabText, activeTab === "available" && styles.tabTextActive]}>
              Available Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "my" && styles.tabBtnActive]}
            onPress={() => setActiveTab("my")}
          >
            <Text style={[styles.tabText, activeTab === "my" && styles.tabTextActive]}>My Deliveries</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "available" ? (
          <AvailableOrdersScreen />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.myWrap}>
            {loadingMy ? (
              <Text style={styles.muted}>Loading deliveries...</Text>
            ) : activeMyDeliveries.length === 0 ? (
              <Text style={styles.muted}>No active deliveries</Text>
            ) : (
              activeMyDeliveries.map((order) => (
                <View key={order._id} style={styles.card}>
                  <Text style={styles.cardTitle}>Order #{order._id.slice(-6)}</Text>
                  <Text style={styles.meta}>Customer: {order.user?.name || "N/A"}</Text>
                  <Text style={styles.meta}>
                    Address:{" "}
                    {[order.address?.address, order.address?.city].filter(Boolean).join(", ") || "N/A"}
                  </Text>
                  <Text style={styles.meta}>Status: {order.deliveryStatus === "assigned" ? "assigned" : order.deliveryStatus}</Text>
                  <View style={styles.timeline}>
                    <Text style={styles.timelineText}>
                      assigned → picked up → out for delivery → delivered
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      disabled={updatingId === order._id}
                      onPress={() => markPickedUp(order._id)}
                    >
                      <Text style={styles.primaryText}>Mark as Picked Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.secondaryBtn]}
                      disabled={updatingId === order._id}
                      onPress={() => sendOtp(order._id)}
                    >
                      <Text style={styles.secondaryText}>Send OTP to Customer</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.confirmRow}>
                    <TextInput
                      placeholder="Enter OTP"
                      placeholderTextColor={colors.textMuted}
                      value={otpInputs[order._id] ?? ""}
                      keyboardType="number-pad"
                      onChangeText={(v) => setOtpInputs((prev) => ({ ...prev, [order._id]: v }))}
                      style={styles.otpInput}
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      disabled={updatingId === order._id}
                      onPress={() => confirmDelivery(order._id)}
                    >
                      <Text style={styles.primaryText}>Confirm Delivery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    margin: SCREEN_PADDING,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.card },
  tabText: { color: colors.textMuted, fontWeight: "700" },
  tabTextActive: { color: colors.primary },
  myWrap: { padding: SCREEN_PADDING, gap: 12, paddingBottom: 24 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: { fontSize: 16, color: colors.textPrimary, fontWeight: "800" },
  meta: { fontSize: 13, color: colors.textSecondary },
  timeline: { backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginTop: 6 },
  timelineText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  confirmRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 8 },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  primaryBtn: { backgroundColor: colors.primary },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  secondaryText: { color: colors.textPrimary, fontWeight: "700", fontSize: 12 },
});
