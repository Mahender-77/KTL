import { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/utils/apiError";

export type AvailableOrder = {
  _id: string;
  itemsCount: number;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  distanceKm: number | null;
  store?: { _id: string; name: string; city?: string; address?: string } | null;
};

type Props = {
  orders: AvailableOrder[];
  loading: boolean;
  refreshing: boolean;
  onManualRefresh: () => void;
  /** Parent handles optimistic cache update + API + rollback */
  onAcceptOrder: (order: AvailableOrder) => void | Promise<void>;
};

function AvailableOrdersScreen({
  orders,
  loading,
  refreshing,
  onManualRefresh,
  onAcceptOrder,
}: Props) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const isAcceptingAnyOrder = acceptingId != null;

  const acceptOrder = useCallback(
    async (order: AvailableOrder) => {
      try {
        setAcceptingId(order._id);
        await onAcceptOrder(order);
        Alert.alert("Order accepted", "This order is now assigned to you.");
      } catch (error) {
        Alert.alert("Error", getApiErrorMessage(error, "Could not accept this order."));
      } finally {
        setAcceptingId(null);
      }
    },
    [onAcceptOrder]
  );

  if (loading && orders.length === 0 && !isAcceptingAnyOrder) {
    return (
      <View style={s.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.stateText}>Loading available orders...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="list-outline" size={40} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>No available orders</Text>
        <Text style={s.emptySubtitle}>Pull to refresh or check again shortly.</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={onManualRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh" size={15} color="#fff" />
          <Text style={s.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.listWrap}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onManualRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {orders.map((order) => {
        const isAccepting = acceptingId === order._id;
        return (
          <View key={order._id} style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.poolLabel}>Available to accept</Text>
              <View style={s.distanceBadge}>
                <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                <Text style={s.distanceText}>
                  {typeof order.distanceKm === "number" && Number.isFinite(order.distanceKm)
                    ? `${order.distanceKm.toFixed(1)} km`
                    : "N/A"}
                </Text>
              </View>
            </View>

            <Text style={s.storeName}>{order.store?.name || "Store"}</Text>
            <Text style={s.storeMeta}>{order.store?.city || "City unknown"}</Text>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Items</Text>
              <Text style={s.infoValue}>{order.itemsCount}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Order total</Text>
              <Text style={s.infoValue}>₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Delivery fee</Text>
              <Text style={s.infoValue}>₹{Number(order.deliveryFee || 0).toLocaleString("en-IN")}</Text>
            </View>
            <Text style={s.addressText}>{order.deliveryAddress || "Address unavailable"}</Text>

            <TouchableOpacity
              style={[s.acceptBtn, isAccepting && { opacity: 0.7 }]}
              onPress={() => void acceptOrder(order)}
              disabled={isAccepting}
              activeOpacity={0.85}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={s.acceptBtnText}>Accept Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default memo(AvailableOrdersScreen);

const s = StyleSheet.create({
  listWrap: { padding: 12, gap: 10 },
  centerState: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  refreshBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  refreshBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    padding: 12,
    gap: 8,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  poolLabel: { fontSize: 12, fontWeight: "800", color: colors.textPrimary },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  storeName: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  storeMeta: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  infoValue: { fontSize: 12, color: colors.textPrimary, fontWeight: "700" },
  addressText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EDF1F5",
  },
  acceptBtn: {
    marginTop: 4,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  acceptBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
