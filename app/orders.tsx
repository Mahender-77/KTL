// app/orders.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Loader from "@/components/common/Loader";
import { useState, useCallback, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import * as Linking from "expo-linking";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";
import { parseImageUri } from "@/utils/imageUri";

const DELIVERY_FEE = 40;
const FREE_DELIVERY_THRESHOLD = 500;
const TAX_RATE_PERCENT = 5;

function formatPrice(value: number): string {
  return Math.floor(value).toLocaleString();
}

interface OrderItem {
  product: { _id: string; name: string; images: string[] };
  variant: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: "placed" | "shipped" | "delivered" | "cancelled";
  deliveryStatus?: "assigned" | "accepted" | "in-transit" | "delivered" | null;
  paymentStatus: "pending" | "paid" | "failed";
  address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  createdAt: string;
}

function getOrderCharges(order: Order) {
  const subtotal = order.items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const taxAmount = TAX_RATE_PERCENT > 0 ? (subtotal * TAX_RATE_PERCENT) / 100 : 0;
  return { subtotal, deliveryFee, taxAmount };
}

interface TrackingData {
  deliveryPerson: { name: string; phone?: string } | null;
  location: { latitude: number; longitude: number; lastUpdated: string } | null;
  deliveryStatus: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  switch (status) {
    case "delivered": return { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", icon: "checkmark-circle" as const, label: "Delivered" };
    case "shipped":   return { color: colors.primary, bg: "#EEF2FF", border: "#C7D2FE", icon: "car" as const, label: "Shipped" };
    case "placed":    return { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "time" as const, label: "Placed" };
    case "cancelled": return { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "close-circle" as const, label: "Cancelled" };
    default:          return { color: colors.textMuted, bg: "#F4F6F9", border: "#E8ECF0", icon: "ellipse" as const, label: status };
  }
}

function getPaymentConfig(status: string) {
  switch (status) {
    case "paid":    return { color: "#16A34A", bg: "#F0FDF4", icon: "checkmark-circle" as const, label: "Paid" };
    case "failed":  return { color: "#DC2626", bg: "#FEF2F2", icon: "close-circle" as const, label: "Failed" };
    default:        return { color: "#D97706", bg: "#FFFBEB", icon: "time-outline" as const, label: "Pending" };
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

// ── Order status progress track ───────────────────────────────────────────────

const STATUS_STEPS = [
  { key: "placed",    label: "Placed",    icon: "receipt-outline" },
  { key: "shipped",   label: "Shipped",   icon: "car-outline" },
  { key: "delivered", label: "Delivered", icon: "checkmark-circle-outline" },
];

function OrderStatusTrack({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <View style={tr.cancelBanner}>
        <Ionicons name="close-circle" size={13} color="#DC2626" />
        <Text style={tr.cancelText}>Order was cancelled</Text>
      </View>
    );
  }
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <View style={tr.wrap}>
      {STATUS_STEPS.map((step, i) => {
        const done   = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <View key={step.key} style={tr.stepWrap}>
            {i > 0 && <View style={[tr.connector, i <= currentIdx && tr.connectorDone]} />}
            <View style={[tr.dot, done && tr.dotDone, active && tr.dotActive]}>
              <Ionicons name={step.icon as any} size={12} color={done ? "#fff" : "#C8CDD6"} />
            </View>
            <Text style={[tr.label, done && tr.labelDone, active && tr.labelActive]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const tr = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stepWrap: { flex: 1, alignItems: "center", gap: 5, position: "relative" },
  connector: {
    position: "absolute",
    top: 12,
    right: "50%",
    left: "-50%",
    height: 2,
    backgroundColor: "#E8ECF0",
    zIndex: 0,
  },
  connectorDone: { backgroundColor: colors.primary },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F4F6F9",
    borderWidth: 2,
    borderColor: "#E8ECF0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  label: { fontSize: 9, fontWeight: "600", color: "#C8CDD6", textAlign: "center" },
  labelDone: { color: colors.textMuted },
  labelActive: { color: colors.primary, fontWeight: "800" },
  cancelBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelText: { fontSize: 12, color: "#DC2626", fontWeight: "700" },
});

// ── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({
  label, icon, children,
}: {
  label: string; icon: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    setOpen((v) => !v);
    Animated.timing(rotAnim, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={cl.wrap}>
      <TouchableOpacity style={cl.row} onPress={toggle} activeOpacity={0.7}>
        <View style={cl.rowLeft}>
          <View style={cl.icon}>
            <Ionicons name={icon as any} size={13} color={colors.primary} />
          </View>
          <Text style={cl.label}>{label}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={cl.body}>{children}</View>}
    </View>
  );
}

const cl = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#EAEDF2",
    borderRadius: 11,
    overflow: "hidden",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F8FAFC",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await axiosInstance.get("/api/orders/my");
      setOrders(res.data?.data ?? []);
    } catch {} finally { if (showLoading) setLoading(false); }
  }, []);

  const onRefreshOrders = useCallback(async () => {
    setRefreshing(true);
    try { const res = await axiosInstance.get("/api/orders/my"); setOrders(res.data?.data ?? []); }
    catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { void fetchOrders(true); }, [fetchOrders]);

  useEffect(() => {
    if (!selectedOrder) { setTrackingData(null); return; }
    let cancelled = false;
    const go = async () => {
      try {
        setMapLoading(true);
        const res = await axiosInstance.get(`/api/delivery/orders/${selectedOrder}/tracking`);
        if (!cancelled) setTrackingData(res.data as TrackingData);
      } catch { if (!cancelled) setTrackingData(null); }
      finally { if (!cancelled) setMapLoading(false); }
    };
    void go();
    return () => { cancelled = true; };
  }, [selectedOrder]);

  const handleTrackOrder = (id: string) => { setSelectedOrder(id); setShowMap(true); setTrackingData(null); };
  const handleCloseMap   = () => { setShowMap(false); setSelectedOrder(null); setTrackingData(null); };
  const toggleExpanded   = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <Loader variant="fullscreen" message="Loading orders..." />;

  return (
    <>
      <Stack.Screen options={coerceNavBooleanOptions({ headerShown: false, animationMatchesGesture: false, freezeOnBlur: false })} />
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>My Orders</Text>
            {orders.length > 0 && (
              <View style={s.headerBadge}><Text style={s.headerBadgeText}>{orders.length}</Text></View>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Empty */}
        {orders.length === 0 ? (
          <ScrollView
            contentContainerStyle={s.emptyWrap}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshOrders} tintColor={colors.primary} colors={[colors.primary]} />}
          >
            <View style={s.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={44} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySub}>Your orders will appear here once you shop</Text>
            <TouchableOpacity style={s.shopBtn} onPress={() => router.push("/(tabs)")} activeOpacity={0.85}>
              <Text style={s.shopBtnText}>Start Shopping</Text>
              <Ionicons name="arrow-forward" size={15} color="#fff" />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshOrders} tintColor={colors.primary} colors={[colors.primary]} />}
          >
            {orders.map((order) => {
              const statusCfg  = getStatusConfig(order.orderStatus);
              const paymentCfg = getPaymentConfig(order.paymentStatus);
              const { subtotal, deliveryFee, taxAmount } = getOrderCharges(order);
              const isExpanded  = expandedItems.has(order._id);
              const canTrack    = order.deliveryStatus === "in-transit" || order.orderStatus === "shipped";

              return (
                <View key={order._id} style={s.orderCard}>

                  {/* Top row */}
                  <View style={s.cardTop}>
                    <View>
                      <Text style={s.orderId}>#{order._id.slice(-8).toUpperCase()}</Text>
                      <Text style={s.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
                      <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                      <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>

                  {/* Status track */}
                  <OrderStatusTrack status={order.orderStatus} />

                  {/* Item thumbnails row + toggle */}
                  <View style={s.thumbSection}>
                    <View style={s.thumbRow}>
                      {order.items.slice(0, 4).map((item, i) => {
                        const uri = parseImageUri(item.product?.images?.[0]);
                        return (
                          <View key={i} style={s.thumbWrap}>
                            {uri ? (
                              <Image source={{ uri }} style={s.thumb} resizeMode="cover" />
                            ) : (
                              <View style={[s.thumb, s.thumbEmpty]}>
                                <Ionicons name="image-outline" size={13} color={colors.textMuted} />
                              </View>
                            )}
                            {i === 3 && order.items.length > 4 && (
                              <View style={s.thumbOverlay}>
                                <Text style={s.thumbOverlayText}>+{order.items.length - 4}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <TouchableOpacity style={s.toggleBtn} onPress={() => toggleExpanded(order._id)} activeOpacity={0.7}>
                      <Text style={s.toggleText}>
                        {isExpanded ? "Hide" : `${order.items.length} item${order.items.length > 1 ? "s" : ""}`}
                      </Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Expanded items */}
                  {isExpanded && (
                    <View style={s.itemList}>
                      {order.items.map((item, idx) => {
                        const uri = parseImageUri(item.product?.images?.[0]);
                        return (
                          <View key={idx} style={s.itemRow}>
                            {uri ? (
                              <Image source={{ uri }} style={s.itemImg} resizeMode="cover" />
                            ) : (
                              <View style={[s.itemImg, s.itemImgEmpty]}>
                                <Ionicons name="image-outline" size={14} color={colors.textMuted} />
                              </View>
                            )}
                            <View style={s.itemInfo}>
                              <Text style={s.itemName} numberOfLines={1}>{item.product?.name ?? "Product"}</Text>
                              <Text style={s.itemQty}>Qty: {item.quantity}</Text>
                            </View>
                            <Text style={s.itemPrice}>₹{formatPrice((item.price ?? 0) * item.quantity)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={s.divider} />

                  {/* Collapsible: delivery address */}
                  <CollapsibleSection label="Delivery Address" icon="location-outline">
                    <Text style={s.addrName}>{order.address.name}</Text>
                    <Text style={s.addrText}>{order.address.address}</Text>
                    <Text style={s.addrCity}>{order.address.city} — {order.address.pincode}</Text>
                    {order.address.phone ? <Text style={s.addrText}>📞 {order.address.phone}</Text> : null}
                    {order.address.landmark ? <Text style={s.addrText}>Near: {order.address.landmark}</Text> : null}
                  </CollapsibleSection>

                  {/* Collapsible: price details */}
                  <CollapsibleSection label="Price Details" icon="receipt-outline">
                    <View style={s.chargesRow}><Text style={s.chargesLabel}>Subtotal</Text><Text style={s.chargesValue}>₹{formatPrice(subtotal)}</Text></View>
                    <View style={s.chargesRow}>
                      <Text style={s.chargesLabel}>Delivery</Text>
                      <Text style={[s.chargesValue, deliveryFee === 0 && s.freeText]}>{deliveryFee === 0 ? "FREE" : `₹${formatPrice(deliveryFee)}`}</Text>
                    </View>
                    {TAX_RATE_PERCENT > 0 && (
                      <View style={s.chargesRow}><Text style={s.chargesLabel}>GST ({TAX_RATE_PERCENT}%)</Text><Text style={s.chargesValue}>₹{formatPrice(taxAmount)}</Text></View>
                    )}
                    <View style={s.chargesDivider} />
                    <View style={s.chargesRow}>
                      <Text style={s.totalLabel}>Total Paid</Text>
                      <Text style={s.totalValue}>₹{formatPrice(order.totalAmount)}</Text>
                    </View>
                  </CollapsibleSection>

                  {/* Card footer */}
                  <View style={s.cardFooter}>
                    <View style={[s.paymentPill, { backgroundColor: paymentCfg.bg }]}>
                      <Ionicons name={paymentCfg.icon} size={11} color={paymentCfg.color} />
                      <Text style={[s.paymentText, { color: paymentCfg.color }]}>{paymentCfg.label}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    {canTrack && (
                      <TouchableOpacity style={s.trackBtn} onPress={() => handleTrackOrder(order._id)} activeOpacity={0.85}>
                        <Ionicons name="navigate" size={12} color="#fff" />
                        <Text style={s.trackBtnText}>Track</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={s.totalChip}>₹{formatPrice(order.totalAmount)}</Text>
                  </View>

                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        {/* Tracking Modal */}
        <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
          <View style={m.root}>
            <View style={[m.header, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity style={m.backBtn} onPress={handleCloseMap} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={m.headerTitle}>Track Delivery</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={m.body} showsVerticalScrollIndicator={false}>
              {mapLoading ? (
                <View style={m.stateCard}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={m.stateTitle}>Fetching live location...</Text>
                </View>
              ) : trackingData?.location?.latitude && trackingData?.location?.longitude ? (
                <View style={m.locationCard}>
                  <View style={m.locationHeader}>
                    <View style={m.liveDot} />
                    <Text style={m.locationTitle}>Live Location</Text>
                    {trackingData.location.lastUpdated && (
                      <Text style={m.locationUpdated}>
                        {new Date(trackingData.location.lastUpdated).toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                  <View style={m.coordCard}>
                    <View style={m.coordRow}><Text style={m.coordLabel}>Latitude</Text><Text style={m.coordValue}>{trackingData.location.latitude.toFixed(6)}</Text></View>
                    <View style={m.coordDivider} />
                    <View style={m.coordRow}><Text style={m.coordLabel}>Longitude</Text><Text style={m.coordValue}>{trackingData.location.longitude.toFixed(6)}</Text></View>
                  </View>
                  <View style={m.mapBtns}>
                    <TouchableOpacity
                      style={m.mapBtnPrimary}
                      onPress={() => trackingData.location && Linking.openURL(`https://www.google.com/maps?q=${trackingData.location.latitude},${trackingData.location.longitude}`)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="map" size={14} color="#fff" />
                      <Text style={m.mapBtnPrimaryText}>Google Maps</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={m.mapBtnOutline}
                      onPress={() => trackingData.location && Linking.openURL(`https://www.openstreetmap.org/?mlat=${trackingData.location.latitude}&mlon=${trackingData.location.longitude}&zoom=15`)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="globe-outline" size={14} color={colors.primary} />
                      <Text style={m.mapBtnOutlineText}>Browser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={m.stateCard}>
                  <View style={m.stateIconWrap}>
                    <Ionicons name="location-outline" size={36} color={colors.textMuted} />
                  </View>
                  <Text style={m.stateTitle}>Location unavailable</Text>
                  <Text style={m.stateSub}>Your delivery partner's location will appear once they start delivery.</Text>
                </View>
              )}

              {trackingData && (
                <View style={m.partnerCard}>
                  <View style={m.partnerRow}>
                    <View style={m.partnerAvatar}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={m.partnerName}>{trackingData.deliveryPerson?.name || "Delivery Partner"}</Text>
                      <View style={m.partnerStatusRow}>
                        <View style={m.statusDot} />
                        <Text style={m.partnerStatus}>{trackingData.deliveryStatus?.replace(/-/g, " ").toUpperCase() || "IN TRANSIT"}</Text>
                      </View>
                    </View>
                    {trackingData.deliveryPerson?.phone && (
                      <TouchableOpacity style={m.callBtn} onPress={() => Linking.openURL(`tel:${trackingData.deliveryPerson?.phone}`)} activeOpacity={0.85}>
                        <Ionicons name="call" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6F9" },
  header: {
    backgroundColor: "#0F1923",
    paddingBottom: 14,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  headerBadge: { backgroundColor: colors.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  headerBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12, paddingVertical: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  shopBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
  },
  shopBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 20 },

  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  orderId: { fontSize: 13, fontWeight: "800", color: colors.textPrimary, letterSpacing: 0.3, marginBottom: 2 },
  orderDate: { fontSize: 11, color: colors.textMuted, fontWeight: "500" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Thumbnails
  thumbSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  thumbRow: { flexDirection: "row", gap: 6 },
  thumbWrap: { position: "relative" },
  thumb: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#F4F6F9", borderWidth: 1, borderColor: "#EAEDF2" },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  thumbOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.42)", borderRadius: 9, alignItems: "center", justifyContent: "center" },
  thumbOverlayText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  toggleText: { fontSize: 11, fontWeight: "700", color: colors.primary },

  // Expanded item list
  itemList: { gap: 7, marginBottom: 12 },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F8FAFC", borderRadius: 9, padding: 9,
    borderWidth: 1, borderColor: "#F0F2F5",
  },
  itemImg: { width: 40, height: 40, borderRadius: 7, backgroundColor: "#F4F6F9", flexShrink: 0 },
  itemImgEmpty: { alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  itemQty: { fontSize: 11, color: colors.textMuted, fontWeight: "500" },
  itemPrice: { fontSize: 12, fontWeight: "800", color: colors.primary, flexShrink: 0 },

  divider: { height: 1, backgroundColor: "#F4F6F9", marginBottom: 8 },

  // Address / charges inside collapsible
  addrName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  addrText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  addrCity: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginTop: 1 },
  chargesRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chargesLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  chargesValue: { fontSize: 12, color: colors.textPrimary, fontWeight: "700" },
  freeText: { color: "#16A34A", fontWeight: "800" },
  chargesDivider: { height: 1, backgroundColor: "#F4F6F9", marginVertical: 3 },
  totalLabel: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  totalValue: { fontSize: 14, fontWeight: "900", color: colors.primary, letterSpacing: -0.3 },

  // Footer
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  paymentPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  paymentText: { fontSize: 11, fontWeight: "700" },
  trackBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3,
  },
  trackBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  totalChip: { fontSize: 15, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.3 },
});

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6F9" },
  header: {
    backgroundColor: "#0F1923", paddingBottom: 14, paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  body: { padding: 12, gap: 10, paddingBottom: 40 },

  stateCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#EAEDF2",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.055, shadowRadius: 8, elevation: 2,
  },
  stateIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#F4F6F9", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stateTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  stateSub: { fontSize: 12, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  locationCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAEDF2",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.055, shadowRadius: 8, elevation: 2, gap: 12,
  },
  locationHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#16A34A",
    shadowColor: "#16A34A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  locationTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  locationUpdated: { fontSize: 10, color: colors.textMuted },
  coordCard: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#EAEDF2", gap: 8 },
  coordRow: { flexDirection: "row", justifyContent: "space-between" },
  coordDivider: { height: 1, backgroundColor: "#EAEDF2" },
  coordLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  coordValue: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  mapBtns: { flexDirection: "row", gap: 8 },
  mapBtnPrimary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  mapBtnPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  mapBtnOutline: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 10, backgroundColor: "#EEF2FF", borderWidth: 1.5, borderColor: colors.primary,
  },
  mapBtnOutlineText: { fontSize: 13, fontWeight: "700", color: colors.primary },

  partnerCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#EAEDF2",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.055, shadowRadius: 8, elevation: 2,
  },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  partnerName: { fontSize: 14, fontWeight: "800", color: colors.textPrimary, marginBottom: 4 },
  partnerStatusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#16A34A" },
  partnerStatus: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  callBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4, flexShrink: 0,
  },
});