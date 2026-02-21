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

interface SubOrderItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  variant: string;
  quantity: number;
  price: number;
}

interface SubOrder {
  _id: string;
  order: {
    _id: string;
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
  };
  category: {
    _id: string;
    name: string;
  };
  categoryName: string;
  items: SubOrderItem[];
  totalAmount: number;
  deliveryStatus: "pending" | "accepted" | "out_for_delivery" | "delivered";
  deliveryBoyId: string | null;
  createdAt: string;
}

export default function DeliveryDashboard() {
  const { logout } = useAuth();
  const [subOrders, setSubOrders] = useState<SubOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [locationTracking, setLocationTracking] = useState(false);

  // Navigate to delivery address
  const handleNavigateToAddress = (subOrder: SubOrder) => {
    const address = `${subOrder.order.address.address}, ${subOrder.order.address.city}, ${subOrder.order.address.pincode}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const fetchSubOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/delivery/suborders");
      setSubOrders(res.data || []);
    } catch (err) {
      console.log("Fetch suborders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubOrders();
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

  const handleAccept = async (subOrderId: string) => {
    try {
      setUpdating(subOrderId);
      await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/accept`);
      await fetchSubOrders();
      Alert.alert("Success", "SubOrder accepted successfully");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to accept suborder");
    } finally {
      setUpdating(null);
    }
  };

  const handleStartDelivery = async (subOrderId: string) => {
    try {
      setUpdating(subOrderId);
      await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/start-delivery`);
      setLocationTracking(true);
      await fetchSubOrders();
      Alert.alert("Success", "Delivery started. Your location is being tracked.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to start delivery");
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (subOrderId: string) => {
    Alert.alert(
      "Complete Delivery",
      "Are you sure you have delivered this suborder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              setUpdating(subOrderId);
              await axiosInstance.post(`/api/delivery/suborders/${subOrderId}/complete`);
              setLocationTracking(false);
              await fetchSubOrders();
              Alert.alert("Success", "SubOrder marked as delivered");
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

  const getStatusColor = (status: string) => {
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
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const availableSubOrders = subOrders.filter((so) => !so.deliveryBoyId);
  const mySubOrders = subOrders.filter(
    (so) => so.deliveryBoyId && so.deliveryStatus !== "delivered"
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
          {/* My Active SubOrders */}
          {mySubOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Active Deliveries</Text>
              {mySubOrders.map((subOrder) => (
                <View key={subOrder._id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        SubOrder #{subOrder._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(subOrder.createdAt)}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(subOrder.deliveryStatus) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(subOrder.deliveryStatus) },
                        ]}
                      >
                        {subOrder.deliveryStatus.toUpperCase().replace("_", " ")}
                      </Text>
                    </View>
                  </View>

                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Ionicons name="pricetag" size={14} color={colors.primary} />
                    <Text style={styles.categoryText}>{subOrder.categoryName || subOrder.category?.name}</Text>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerSection}>
                    <View style={styles.customerHeader}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                      <Text style={styles.customerTitle}>Customer Details</Text>
                    </View>
                    <Text style={styles.customerText}>{subOrder.order.user.name}</Text>
                    <View style={styles.customerContactRow}>
                      <Text style={styles.customerText}>{subOrder.order.user.phone || subOrder.order.user.email}</Text>
                      {subOrder.order.user.phone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => {
                            Linking.openURL(`tel:${subOrder.order.user.phone}`);
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
                        onPress={() => handleNavigateToAddress(subOrder)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                        <Text style={styles.navigateBtnText}>Navigate</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.addressText}>{subOrder.order.address.name}</Text>
                    <Text style={styles.addressText}>{subOrder.order.address.address}</Text>
                    <Text style={styles.addressText}>
                      {subOrder.order.address.city}, {subOrder.order.address.pincode}
                    </Text>
                    {subOrder.order.address.phone && (
                      <View style={styles.addressPhoneRow}>
                        <Text style={styles.addressText}>Phone: {subOrder.order.address.phone}</Text>
                        <TouchableOpacity
                          style={styles.callBtnSmall}
                          onPress={() => {
                            Linking.openURL(`tel:${subOrder.order.address.phone}`);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="call" size={14} color={colors.primary} />
                          <Text style={styles.callBtnTextSmall}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* SubOrder Items */}
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Items ({subOrder.items.length})</Text>
                    {subOrder.items.map((item, idx) => (
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
                    {subOrder.deliveryStatus === "accepted" && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.startBtn]}
                        onPress={() => handleStartDelivery(subOrder._id)}
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
                    {subOrder.deliveryStatus === "out_for_delivery" && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.completeBtn]}
                        onPress={() => handleComplete(subOrder._id)}
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

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Category Total:</Text>
                    <Text style={styles.totalAmount}>₹{subOrder.totalAmount.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Available SubOrders */}
          {availableSubOrders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Deliveries</Text>
              {availableSubOrders.map((subOrder) => (
                <View key={subOrder._id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>
                        SubOrder #{subOrder._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(subOrder.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Ionicons name="pricetag" size={14} color={colors.primary} />
                    <Text style={styles.categoryText}>{subOrder.categoryName || subOrder.category?.name}</Text>
                  </View>

                  {/* Customer Info */}
                  <View style={styles.customerSection}>
                    <Text style={styles.customerText}>{subOrder.order.user.name}</Text>
                    <Text style={styles.customerText}>{subOrder.order.address.city}, {subOrder.order.address.pincode}</Text>
                  </View>

                  {/* Items Preview */}
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Items ({subOrder.items.length})</Text>
                    {subOrder.items.slice(0, 2).map((item, idx) => (
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
                      </View>
                    ))}
                    {subOrder.items.length > 2 && (
                      <Text style={styles.moreItemsText}>+{subOrder.items.length - 2} more items</Text>
                    )}
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Category Total:</Text>
                    <Text style={styles.totalAmount}>₹{subOrder.totalAmount.toLocaleString()}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(subOrder._id)}
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
                </View>
              ))}
            </View>
          )}

          {subOrders.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={colors.border} />
              <Text style={styles.emptyText}>No deliveries available</Text>
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

