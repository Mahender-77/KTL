import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { getApiErrorMessage } from "@/utils/apiError";

type AvailableOrder = {
  _id: string;
  itemsCount: number;
  totalAmount: number;
  deliveryAddress: string;
  deliveryFee: number;
  distanceKm: number;
};

export default function AvailableOrdersScreen() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Location permission is required to view nearby orders.");
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const res = await axiosInstance.get("/api/orders/available", {
        params: {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
        },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(list);
    } catch (error) {
      if (mode !== "silent") {
        Alert.alert("Error", getApiErrorMessage(error, "Could not load available orders."));
      }
    } finally {
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders("initial");
  }, [loadOrders]);

  useEffect(() => {
    const id = setInterval(() => {
      loadOrders("silent");
    }, 30000);
    return () => clearInterval(id);
  }, [loadOrders]);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/accept`);
      await loadOrders("silent");
      Alert.alert("Success", "Order accepted.");
    } catch (error) {
      Alert.alert("Order unavailable", getApiErrorMessage(error, "Sorry, this order was already accepted."));
      await loadOrders("silent");
    } finally {
      setUpdatingId(null);
    }
  }, [loadOrders]);

  const rejectOrder = useCallback(async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await axiosInstance.post(`/api/orders/${orderId}/reject`);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error, "Could not reject order."));
    } finally {
      setUpdatingId(null);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Loading available orders...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadOrders("refresh")} tintColor={colors.primary} />
      }
    >
      {orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No orders available nearby</Text>
        </View>
      ) : (
        orders.map((order) => (
          <View key={order._id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>Order #{order._id.slice(-6)}</Text>
              <Text style={styles.distance}>
                {order.distanceKm >= 9999 ? "Distance unknown" : `${order.distanceKm.toFixed(1)} km away`}
              </Text>
            </View>
            <Text style={styles.meta}>{order.itemsCount} items • ₹{order.totalAmount}</Text>
            <Text style={styles.meta}>Deliver to: {order.deliveryAddress || "Address unavailable"}</Text>
            <Text style={styles.meta}>Delivery fee: ₹{order.deliveryFee}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                disabled={updatingId === order._id}
                onPress={() => rejectOrder(order._id)}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                disabled={updatingId === order._id}
                onPress={() => acceptOrder(order._id)}
              >
                <Text style={styles.acceptText}>Accept Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SCREEN_PADDING, paddingBottom: 30, gap: 12 },
  center: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  distance: { fontSize: 13, color: colors.primary, fontWeight: "700" },
  meta: { fontSize: 13, color: colors.textSecondary },
  actions: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  rejectBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  acceptBtn: { backgroundColor: colors.primary },
  rejectText: { color: colors.textPrimary, fontWeight: "700" },
  acceptText: { color: "#fff", fontWeight: "700" },
});
