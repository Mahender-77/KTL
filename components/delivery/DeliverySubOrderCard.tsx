import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { colors } from "@/constants/colors";
import type { DeliverySubOrder } from "@/types/delivery";
import { parseImageUri } from "@/utils/imageUri";

function OrderLineThumb({ imageUrl }: { imageUrl?: string }) {
  const u = parseImageUri(imageUrl);
  return u ? (
    <Image source={{ uri: u }} style={styles.itemImage} />
  ) : (
    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
      <Ionicons name="image-outline" size={20} color={colors.textMuted} />
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "delivered":
      return colors.success;
    case "out_for_delivery":
      return colors.primary;
    case "accepted":
      return colors.textMuted;
    case "pending":
      return colors.border;
    default:
      return colors.border;
  }
}

function formatDeliveryDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

export type DeliveryCardVariant = "active" | "pool";

type Props = {
  subOrder: DeliverySubOrder;
  variant: DeliveryCardVariant;
  updating: string | null;
  onNavigateToAddress: (sub: DeliverySubOrder) => void;
  onAccept?: (id: string) => void;
  onStartDelivery?: (id: string) => void;
  onComplete?: (id: string) => void;
  /** When set, tapping the title row navigates to detail (e.g. deep link / focus view). */
  onPressHeader?: () => void;
};

export function DeliverySubOrderCard({
  subOrder,
  variant,
  updating,
  onNavigateToAddress,
  onAccept,
  onStartDelivery,
  onComplete,
  onPressHeader,
}: Props) {
  const headerInner = (
    <>
      <View style={styles.orderHeaderText}>
        <Text style={styles.orderId}>SubOrder #{subOrder._id.slice(-8).toUpperCase()}</Text>
        {subOrder.order?._id && (
          <Text style={styles.orderRef}>Order #{subOrder.order._id.slice(-8).toUpperCase()}</Text>
        )}
        {subOrder.order?.orderStatus ? (
          <Text style={styles.orderStatusLine}>Shop status: {subOrder.order.orderStatus}</Text>
        ) : null}
        <Text style={styles.orderDate}>{formatDeliveryDate(subOrder.createdAt)}</Text>
      </View>
      {variant === "active" ? (
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(subOrder.deliveryStatus) + "20" },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(subOrder.deliveryStatus) }]}>
            {formatStatusLabel(subOrder.deliveryStatus)}
          </Text>
        </View>
      ) : null}
    </>
  );

  const headerRow = onPressHeader ? (
    <TouchableOpacity
      style={styles.orderHeaderTouchable}
      onPress={onPressHeader}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Open delivery details"
    >
      {headerInner}
    </TouchableOpacity>
  ) : (
    <View style={styles.orderHeaderRow}>{headerInner}</View>
  );

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>{headerRow}</View>

      {subOrder.order?.totalAmount != null && (
        <View style={styles.orderDetailsRow}>
          <Text style={styles.orderDetailsLabel}>Order Total:</Text>
          <Text style={styles.orderDetailsValue}>₹{subOrder.order.totalAmount.toLocaleString()}</Text>
          {subOrder.order.paymentStatus && (
            <View
              style={[styles.paymentBadge, subOrder.order.paymentStatus === "paid" && styles.paymentBadgePaid]}
            >
              <Text
                style={[
                  styles.paymentBadgeText,
                  subOrder.order.paymentStatus === "paid" && styles.paymentBadgeTextPaid,
                ]}
              >
                {subOrder.order.paymentStatus === "paid" ? "Paid" : subOrder.order.paymentStatus}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.categoryBadge}>
        <Ionicons name="pricetag" size={14} color={colors.primary} />
        <Text style={styles.categoryText}>{subOrder.categoryName || subOrder.category?.name}</Text>
      </View>

      {variant === "active" ? (
        <>
          <View style={styles.customerSection}>
            <View style={styles.customerHeader}>
              <Ionicons name="person" size={16} color={colors.primary} />
              <Text style={styles.customerTitle}>Customer Details</Text>
            </View>
            <Text style={styles.customerText}>{subOrder.order?.user?.name ?? "—"}</Text>
            <View style={styles.customerContactRow}>
              <Text style={styles.customerText}>
                {(subOrder.order?.user?.phone || subOrder.order?.user?.email) ?? "—"}
              </Text>
              {subOrder.order?.user?.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${subOrder.order?.user?.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.addressSection}>
            <View style={styles.addressHeader}>
              <View style={styles.addressHeaderLeft}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.addressTitle}>Delivery Address</Text>
              </View>
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => onNavigateToAddress(subOrder)}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate" size={16} color={colors.primary} />
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>{subOrder.order?.address?.name ?? "—"}</Text>
            <Text style={styles.addressText}>{subOrder.order?.address?.address ?? "—"}</Text>
            <Text style={styles.addressText}>
              {subOrder.order?.address?.city ?? ""}, {subOrder.order?.address?.pincode ?? ""}
            </Text>
            {subOrder.order?.address?.phone && (
              <View style={styles.addressPhoneRow}>
                <Text style={styles.addressText}>Phone: {subOrder.order?.address?.phone}</Text>
                <TouchableOpacity
                  style={styles.callBtnSmall}
                  onPress={() => Linking.openURL(`tel:${subOrder.order?.address?.phone}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={14} color={colors.primary} />
                  <Text style={styles.callBtnTextSmall}>Call</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.customerSection}>
          <Text style={styles.customerText}>{subOrder.order?.user?.name ?? "—"}</Text>
          <Text style={styles.customerText}>
            {subOrder.order?.address?.city ?? ""}, {subOrder.order?.address?.pincode ?? ""}
          </Text>
        </View>
      )}

      <View style={styles.itemsSection}>
        <Text style={styles.itemsTitle}>Items ({(subOrder.items ?? []).length})</Text>
        {variant === "active"
          ? (subOrder.items ?? []).map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <OrderLineThumb imageUrl={item.product?.images?.[0]} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product?.name}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toLocaleString()}</Text>
              </View>
            ))
          : (subOrder.items ?? []).slice(0, 2).map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <OrderLineThumb imageUrl={item.product?.images?.[0]} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product?.name}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
              </View>
            ))}
        {variant === "pool" && (subOrder.items ?? []).length > 2 && (
          <Text style={styles.moreItemsText}>+{(subOrder.items ?? []).length - 2} more items</Text>
        )}
      </View>

      {variant === "active" && (
        <View style={styles.actions}>
          {subOrder.deliveryStatus === "accepted" && onStartDelivery && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn]}
              onPress={() => onStartDelivery(subOrder._id)}
              disabled={updating === subOrder._id}
            >
              {updating === subOrder._id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Start Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {subOrder.deliveryStatus === "out_for_delivery" && onComplete && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => onComplete(subOrder._id)}
              disabled={updating === subOrder._id}
            >
              {updating === subOrder._id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark as Delivered</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Category Total:</Text>
        <Text style={styles.totalAmount}>₹{subOrder.totalAmount.toLocaleString()}</Text>
      </View>

      {variant === "pool" && onAccept && (
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => onAccept(subOrder._id)}
          disabled={updating === subOrder._id}
        >
          {updating === subOrder._id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Accept Delivery</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  orderHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderHeaderTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderHeaderText: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  orderRef: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  orderStatusLine: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  orderDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderDetailsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  orderDetailsValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    flex: 1,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.border + "40",
  },
  paymentBadgePaid: {
    backgroundColor: colors.success + "25",
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  paymentBadgeTextPaid: {
    color: colors.success,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  customerSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  customerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  customerText: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  customerContactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  callBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary + "15",
    marginLeft: 8,
  },
  callBtnTextSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  addressPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  addressSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary + "15",
  },
  navigateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  addressText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  itemsSection: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.border,
    marginRight: 10,
  },
  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  actions: {
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  startBtn: {
    backgroundColor: colors.primary,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  moreItemsText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  },
});
