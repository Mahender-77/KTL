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
  Dimensions,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Linking from "expo-linking";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";

const { width, height } = Dimensions.get("window");

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  };
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

interface TrackingData {
  deliveryPerson: {
    name: string;
    phone?: string;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  } | null;
  deliveryStatus: string;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/orders");
      setOrders(res.data || []);
    } catch (err) {
      console.log("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  // Fetch tracking data with polling every 3 seconds
  useEffect(() => {
    if (!selectedOrder) {
      setTrackingData(null);
      return;
    }

    const fetchTracking = async () => {
      try {
        if (!trackingData) setMapLoading(true);
        const res = await axiosInstance.get(`/api/delivery/orders/${selectedOrder}/tracking`);
        const data: TrackingData = res.data;
        setTrackingData(data);
        
        // Location data updated - will be displayed in the UI
      } catch (err) {
        console.log("Fetch tracking error:", err);
      } finally {
        setMapLoading(false);
      }
    };

    // Initial fetch
    fetchTracking();

    // Poll every 3 seconds
    const interval = setInterval(fetchTracking, 3000);

    return () => clearInterval(interval);
  }, [selectedOrder]);

  const handleTrackOrder = (orderId: string) => {
    setSelectedOrder(orderId);
    setShowMap(true);
    setTrackingData(null);
  };

  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedOrder(null);
    setTrackingData(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return colors.success;
      case "shipped":
        return colors.primary;
      case "placed":
        return colors.textMuted;
      case "cancelled":
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return "checkmark-circle";
      case "shipped":
        return "car";
      case "placed":
        return "time";
      case "cancelled":
        return "close-circle";
      default:
        return "ellipse";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primaryDark}
          translucent={false}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBlob} />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 36 }} />
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.border} />
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>
              Your orders will appear here
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => router.push("/(tabs)")}
              activeOpacity={0.85}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {orders.map((order) => (
              <View key={order._id} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </Text>
                    <Text style={styles.orderDate}>
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.orderStatus) + "20" },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(order.orderStatus) as any}
                      size={14}
                      color={getStatusColor(order.orderStatus)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.orderStatus) },
                      ]}
                    >
                      {order.orderStatus.charAt(0).toUpperCase() +
                        order.orderStatus.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={styles.orderItems}>
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Image
                        source={{
                          uri: item.product?.images?.[0] ?? "",
                        }}
                        style={styles.orderItemImage}
                        resizeMode="cover"
                      />
                      <View style={styles.orderItemDetails}>
                        <Text style={styles.orderItemName} numberOfLines={2}>
                          {item.product?.name ?? "Product"}
                        </Text>
                        <Text style={styles.orderItemQty}>
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text style={styles.orderItemPrice}>
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Delivery Address */}
                <View style={styles.addressSection}>
                  <View style={styles.addressHeader}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text style={styles.addressTitle}>Delivery Address</Text>
                  </View>
                  <Text style={styles.addressText}>
                    {order.address.name}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.address.address}
                  </Text>
                  <Text style={styles.addressText}>
                    {order.address.city}, {order.address.pincode}
                  </Text>
                  {order.address.landmark && (
                    <Text style={styles.addressText}>
                      Landmark: {order.address.landmark}
                    </Text>
                  )}
                </View>

                {/* Order Footer */}
                <View style={styles.orderFooter}>
                  <View style={styles.paymentStatus}>
                    <Text style={styles.paymentLabel}>Payment:</Text>
                    <View
                      style={[
                        styles.paymentBadge,
                        {
                          backgroundColor:
                            order.paymentStatus === "paid"
                              ? colors.success + "20"
                              : colors.textMuted + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentText,
                          {
                            color:
                              order.paymentStatus === "paid"
                                ? colors.success
                                : colors.textMuted,
                          },
                        ]}
                      >
                        {order.paymentStatus === "paid" ? "Paid" : "Pending"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>
                      ₹{order.totalAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Track Order Button for in-transit orders */}
                {(order.deliveryStatus === "in-transit" || order.orderStatus === "shipped") && (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => handleTrackOrder(order._id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location" size={18} color={colors.primary} />
                    <Text style={styles.trackBtnText}>Track Delivery</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Tracking Map Modal */}
        <Modal
          visible={showMap}
          animationType="slide"
          onRequestClose={() => setShowMap(false)}
        >
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <TouchableOpacity
                style={styles.mapCloseBtn}
                onPress={handleCloseMap}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.mapHeaderTitle}>Track Your Order</Text>
              <View style={{ width: 40 }} />
            </View>

            {mapLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.mapLoadingText}>Loading location...</Text>
              </View>
            ) : trackingData?.location?.latitude && trackingData?.location?.longitude ? (
              <View style={styles.mapContainer}>
                <View style={styles.mapFallback}>
                  <Ionicons name="location" size={64} color={colors.primary} />
                  <Text style={styles.mapFallbackTitle}>Live Delivery Location</Text>
                  <Text style={styles.mapFallbackCoords}>
                    {trackingData.location.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.mapFallbackCoords}>
                    {trackingData.location.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.mapFallbackSubtext}>
                    Location updates every 3 seconds
                  </Text>
                  <View style={styles.mapActions}>
                    <TouchableOpacity
                      style={styles.mapActionBtn}
                      onPress={() => {
                        if (trackingData.location) {
                          const url = `https://www.google.com/maps?q=${trackingData.location.latitude},${trackingData.location.longitude}`;
                          Linking.openURL(url);
                        }
                      }}
                    >
                      <Ionicons name="map" size={18} color="#fff" />
                      <Text style={styles.mapActionBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mapActionBtn, styles.mapActionBtnSecondary]}
                      onPress={() => {
                        if (trackingData.location) {
                          const url = `https://www.openstreetmap.org/?mlat=${trackingData.location.latitude}&mlon=${trackingData.location.longitude}&zoom=15`;
                          Linking.openURL(url);
                        }
                      }}
                    >
                      <Ionicons name="globe" size={18} color={colors.primary} />
                      <Text style={[styles.mapActionBtnText, { color: colors.primary }]}>
                        Open in Browser
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.mapLoadingContainer}>
                <Ionicons name="location-outline" size={64} color={colors.border} />
                <Text style={styles.mapLoadingText}>Location not available</Text>
                <Text style={styles.mapLoadingSubtext}>
                  The delivery person's location will appear here once they start delivery
                </Text>
              </View>
            )}

            {trackingData && (
              <View style={styles.trackingInfo}>
                <View style={styles.trackingInfoRow}>
                  <Ionicons name="person" size={16} color={colors.textMuted} />
                  <Text style={styles.trackingInfoText}>
                    {trackingData.deliveryPerson?.name || "Delivery Person"}
                  </Text>
                </View>
                <View style={styles.trackingInfoRow}>
                  <Ionicons name="car" size={16} color={colors.textMuted} />
                  <Text style={styles.trackingInfoText}>
                    Status: {trackingData.deliveryStatus?.toUpperCase() || "IN TRANSIT"}
                  </Text>
                </View>
                {trackingData.location?.lastUpdated && (
                  <View style={styles.trackingInfoRow}>
                    <Ionicons name="time" size={16} color={colors.textMuted} />
                    <Text style={styles.trackingInfoText}>
                      Last updated: {new Date(trackingData.location.lastUpdated).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  shopBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  shopBtnText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -50,
    right: -20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_PADDING,
    paddingBottom: 20,
    gap: 16,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderHeaderLeft: {
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  orderItems: {
    gap: 12,
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderItemQty: {
    fontSize: 11,
    color: colors.textMuted,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  addressSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  addressText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: "700",
  },
  totalSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    letterSpacing: -0.5,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SCREEN_PADDING,
    backgroundColor: colors.card,
    margin: SCREEN_PADDING,
    borderRadius: 16,
  },
  mapFallbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  mapFallbackCoords: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
    fontFamily: "monospace",
  },
  mapFallbackSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: "center",
  },
  mapActions: {
    width: "100%",
    gap: 12,
  },
  mapActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  mapActionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  mapActionBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mapCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  map: {
    flex: 1,
  },
  mapLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  mapLoadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  mapLoadingSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  trackingInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    padding: SCREEN_PADDING,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 8,
  },
  trackingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackingInfoText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

