// app/(delivery)/dashboard.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";

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
  deliveryStatus: "assigned" | "accepted" | "in-transit" | "delivered" | null;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  createdAt: string;
  deliveryPerson: string | null;
}

export default function DeliveryDashboard() {
  const { logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);

  // Navigate to delivery address
  const handleNavigateToAddress = (order: Order) => {
    const address = `${order.address.address}, ${order.address.city}, ${order.address.pincode}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/delivery/orders");
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

  // Location tracking for in-transit orders
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (locationTracking) {
      const updateLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") return;

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          await axiosInstance.post("/api/delivery/location", {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          console.log("Location update error:", error);
        }
      };

      updateLocation();
      interval = setInterval(updateLocation, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [locationTracking]);

  const handleAccept = async (orderId: string) => {
    try {
      setUpdating(orderId);
      await axiosInstance.post(`/api/delivery/orders/${orderId}/accept`);
      await fetchOrders();
      Alert.alert("Success", "Order accepted successfully");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept order");
    } finally {
      setUpdating(null);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    try {
      setUpdating(orderId);
      await axiosInstance.post(`/api/delivery/orders/${orderId}/start-delivery`);
      setLocationTracking(true);
      await fetchOrders();
      Alert.alert("Success", "Delivery started. Your location is being tracked.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to start delivery");
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (orderId: string) => {
    Alert.alert(
      "Complete Delivery",
      "Are you sure you have delivered this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              setUpdating(orderId);
              await axiosInstance.post(`/api/delivery/orders/${orderId}/complete`);
              setLocationTracking(false);
              await fetchOrders();
              Alert.alert("Success", "Order marked as delivered");
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to complete delivery");
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "delivered":
        return colors.success;
      case "in-transit":
        return colors.primary;
      case "accepted":
        return colors.textMuted;
      case "assigned":
        return colors.textMuted;
      default:
        return colors.border;
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

  const availableOrders = orders.filter((o) => !o.deliveryPerson);
  const myOrders = orders.filter(
    (o) => o.deliveryPerson && o.deliveryStatus !== "delivered"
  );

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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primaryDark}
          translucent={false}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBlob} />
          <Text style={styles.headerTitle}>Delivery Dashboard</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* My Active Orders */}
          {myOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Active Orders</Text>
              {myOrders.map((order) => (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        Order #{order._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(order.deliveryStatus) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(order.deliveryStatus) },
                        ]}
                      >
                        {order.deliveryStatus?.toUpperCase() || "ASSIGNED"}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerSection}>
                    <View style={styles.customerHeader}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                      <Text style={styles.customerTitle}>Customer Details</Text>
                    </View>
                    <Text style={styles.customerText}>{order.user.name}</Text>
                    <View style={styles.customerContactRow}>
                      <Text style={styles.customerText}>{order.user.phone || order.user.email}</Text>
                      {order.user.phone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => {
                            Linking.openURL(`tel:${order.user.phone}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call" size={16} color="#fff" />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Delivery Address */}
                  <View style={styles.addressSection}>
                    <View style={styles.addressHeader}>
                      <View style={styles.addressHeaderLeft}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.addressTitle}>Delivery Address</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.navigateBtn}
                        onPress={() => handleNavigateToAddress(order)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                        <Text style={styles.navigateBtnText}>Navigate</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.addressText}>{order.address.name}</Text>
                    <Text style={styles.addressText}>{order.address.address}</Text>
                    <Text style={styles.addressText}>
                      {order.address.city}, {order.address.pincode}
                    </Text>
                    {order.address.phone && (
                      <View style={styles.addressPhoneRow}>
                        <Text style={styles.addressText}>Phone: {order.address.phone}</Text>
                        <TouchableOpacity
                          style={styles.callBtnSmall}
                          onPress={() => {
                            Linking.openURL(`tel:${order.address.phone}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call" size={14} color={colors.primary} />
                          <Text style={styles.callBtnTextSmall}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Order Items */}
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Items ({order.items.length})</Text>
                    {order.items.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Image
                          source={{ uri: item.product?.images?.[0] ?? "" }}
                          style={styles.itemImage}
                        />
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.product?.name}
                          </Text>
                          <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                        </View>
                        <Text style={styles.itemPrice}>
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    {order.deliveryStatus === "accepted" && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.startBtn]}
                        onPress={() => handleStartDelivery(order._id)}
                        disabled={updating === order._id}
                      >
                        {updating === order._id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="play" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Start Delivery</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {order.deliveryStatus === "in-transit" && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.completeBtn]}
                        onPress={() => handleComplete(order._id)}
                        disabled={updating === order._id}
                      >
                        {updating === order._id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Mark as Delivered</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {!order.deliveryStatus && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAccept(order._id)}
                        disabled={updating === order._id}
                      >
                        {updating === order._id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Accept Order</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalAmount}>₹{order.totalAmount.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Available Orders */}
          {availableOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Orders</Text>
              {availableOrders.map((order) => (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        Order #{order._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.addressSection}>
                    <Text style={styles.addressText}>{order.address.address}</Text>
                    <Text style={styles.addressText}>
                      {order.address.city}, {order.address.pincode}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>₹{order.totalAmount.toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(order._id)}
                    disabled={updating === order._id}
                  >
                    {updating === order._id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Accept Order</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {orders.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={styles.emptyText}>No orders available</Text>
            </View>
          )}
        </ScrollView>
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
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_PADDING,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 16,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 16,
  },
});

