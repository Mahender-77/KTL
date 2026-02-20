// app/checkout.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useCart } from "@/context/CartContext";
import { Alert } from "react-native";

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  variant: string;
  quantity: number;
  price: number;
  offerPrice?: number;
}

interface Address {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  landmark?: string;
}

interface SavedAddress {
  _id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

export default function CheckoutScreen() {
  const { refreshCart } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [addressMode, setAddressMode] = useState<"saved" | "manual" | "location">("saved");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [address, setAddress] = useState<Address>({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    landmark: "",
  });

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/cart");
      setItems(res.data.items ?? []);
    } catch (err) {
      console.log("Cart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await axiosInstance.get("/api/addresses");
      setSavedAddresses(res.data || []);
      
      // Auto-select default address if available
      const defaultAddress = res.data?.find((addr: SavedAddress) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
        setAddress({
          name: defaultAddress.name,
          phone: defaultAddress.phone,
          address: defaultAddress.address,
          city: defaultAddress.city,
          pincode: defaultAddress.pincode,
          landmark: defaultAddress.landmark || "",
        });
        setAddressMode("saved");
      } else if (res.data?.length > 0) {
        // Select first address if no default
        const firstAddress = res.data[0];
        setSelectedAddressId(firstAddress._id);
        setAddress({
          name: firstAddress.name,
          phone: firstAddress.phone,
          address: firstAddress.address,
          city: firstAddress.city,
          pincode: firstAddress.pincode,
          landmark: firstAddress.landmark || "",
        });
        setAddressMode("saved");
      }
    } catch (err) {
      console.log("Fetch addresses error:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
      fetchSavedAddresses();
    }, [])
  );

  // Compute totals
  const subtotal = items.reduce((sum, item) => {
    const price = item.offerPrice ?? item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  // Reverse geocoding function to convert coordinates to address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "KTL-App/1.0", // Required by Nominatim
          },
        }
      );
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        return {
          address: [
            addr.house_number ? `${addr.house_number} ` : "",
            addr.road || "",
            addr.suburb ? `, ${addr.suburb}` : "",
            addr.neighbourhood ? `, ${addr.neighbourhood}` : "",
          ]
            .filter(Boolean)
            .join("")
            .trim() || addr.display_name?.split(",")[0] || "",
          city: addr.city || addr.town || addr.village || addr.county || "",
          pincode: addr.postcode || "",
          landmark: addr.landmark || "",
        };
      }
      return null;
    } catch (error) {
      console.log("Reverse geocoding error:", error);
      return null;
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      setLocationError(null);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use your current location. Please enable it in settings."
        );
        setLocationError("Location permission denied");
        setGettingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const addressData = await reverseGeocode(latitude, longitude);

      if (addressData) {
        setAddress((prev) => ({
          ...prev,
          address: addressData.address,
          city: addressData.city,
          pincode: addressData.pincode,
          landmark: addressData.landmark || "",
        }));
        setAddressMode("location");
      } else {
        setLocationError("Could not fetch address. Please enter manually.");
        Alert.alert(
          "Address Not Found",
          "Could not fetch your address from location. Please enter it manually."
        );
      }
    } catch (error) {
      console.log("Location error:", error);
      setLocationError("Failed to get location. Please try again.");
      Alert.alert(
        "Error",
        "Failed to get your current location. Please enter address manually."
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSelectSavedAddress = (savedAddr: SavedAddress) => {
    setSelectedAddressId(savedAddr._id);
    setAddress({
      name: savedAddr.name,
      phone: savedAddr.phone,
      address: savedAddr.address,
      city: savedAddr.city,
      pincode: savedAddr.pincode,
      landmark: savedAddr.landmark || "",
    });
    setAddressMode("saved");
  };

  const handlePlaceOrder = async () => {
    // Validate address
    if (!address.name || !address.phone || !address.address || !address.city || !address.pincode) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }

    try {
      setPlacingOrder(true);
      
      // If using a new address (not from saved), save it first
      if (addressMode !== "saved") {
        try {
          await axiosInstance.post("/api/addresses", {
            ...address,
            isDefault: savedAddresses.length === 0, // Set as default if it's the first address
          });
          await fetchSavedAddresses(); // Refresh saved addresses
        } catch (err) {
          console.log("Save address error:", err);
          // Continue with order even if address save fails
        }
      }
      
      const orderData = {
        items: items.map(item => ({
          product: item.product._id,
          variant: item.variant,
          quantity: item.quantity,
          price: item.offerPrice ?? item.price,
        })),
        totalAmount: total,
        address: address,
        paymentMethod: paymentMethod,
      };

      await axiosInstance.post("/api/orders", orderData);
      
      // Clear cart after successful order
      await axiosInstance.delete("/api/cart/clear");
      await refreshCart();
      
      // Navigate to order success or orders page
      router.replace("/(tabs)");
    } catch (err) {
      console.log("Place order error:", err);
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color={colors.border} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.shopBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Delivery Address Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>

            {/* Saved Addresses */}
            {loadingAddresses ? (
              <View style={styles.loadingAddressesContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingAddressesText}>Loading addresses...</Text>
              </View>
            ) : savedAddresses.length > 0 ? (
              <View style={styles.savedAddressesContainer}>
                <Text style={styles.savedAddressesTitle}>Saved Addresses</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedAddressesList}
                >
                  {savedAddresses.map((savedAddr) => (
                    <TouchableOpacity
                      key={savedAddr._id}
                      style={[
                        styles.savedAddressCard,
                        selectedAddressId === savedAddr._id && styles.savedAddressCardActive,
                      ]}
                      onPress={() => handleSelectSavedAddress(savedAddr)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.savedAddressHeader}>
                        <View style={styles.savedAddressHeaderLeft}>
                          <Ionicons
                            name="location"
                            size={18}
                            color={
                              selectedAddressId === savedAddr._id
                                ? colors.primary
                                : colors.textMuted
                            }
                          />
                          <Text
                            style={[
                              styles.savedAddressName,
                              selectedAddressId === savedAddr._id &&
                                styles.savedAddressNameActive,
                            ]}
                          >
                            {savedAddr.name}
                          </Text>
                        </View>
                        {savedAddr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.savedAddressText} numberOfLines={2}>
                        {savedAddr.address}
                      </Text>
                      <Text style={styles.savedAddressText}>
                        {savedAddr.city}, {savedAddr.pincode}
                      </Text>
                      {selectedAddressId === savedAddr._id && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Add New Address Section */}
            <View style={[styles.newAddressSection, savedAddresses.length === 0 && { marginTop: 0 }]}>
              <TouchableOpacity
                style={styles.addNewAddressBtn}
                onPress={() => {
                  setAddressMode("manual");
                  setSelectedAddressId(null);
                  setAddress({
                    name: "",
                    phone: "",
                    address: "",
                    city: "",
                    pincode: "",
                    landmark: "",
                  });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addNewAddressText}>Add New Address</Text>
              </TouchableOpacity>
            </View>

            {/* Address Mode Toggle - Only show when adding new address */}
            {addressMode !== "saved" && (
              <View style={styles.addressModeContainer}>
              <TouchableOpacity
                style={[
                  styles.addressModeBtn,
                  addressMode === "manual" && styles.addressModeBtnActive,
                ]}
                onPress={() => setAddressMode("manual")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={addressMode === "manual" ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.addressModeText,
                    addressMode === "manual" && styles.addressModeTextActive,
                  ]}
                >
                  Enter Manually
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addressModeBtn,
                  addressMode === "location" && styles.addressModeBtnActive,
                  gettingLocation && styles.addressModeBtnDisabled,
                ]}
                onPress={handleGetCurrentLocation}
                activeOpacity={0.7}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="location"
                    size={18}
                    color={
                      addressMode === "location"
                        ? colors.primary
                        : gettingLocation
                          ? colors.textMuted
                          : colors.textMuted
                    }
                  />
                )}
                <Text
                  style={[
                    styles.addressModeText,
                    addressMode === "location" && styles.addressModeTextActive,
                    gettingLocation && styles.addressModeTextDisabled,
                  ]}
                >
                  Use Current Location
                </Text>
              </TouchableOpacity>
            </View>
            )}

            {locationError && addressMode !== "saved" && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{locationError}</Text>
              </View>
            )}

            {/* Address Form - Only show when not using saved address */}
            {addressMode !== "saved" && (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name *"
                  placeholderTextColor={colors.textMuted}
                  value={address.name}
                  onChangeText={(text) => setAddress({ ...address, name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number *"
                  placeholderTextColor={colors.textMuted}
                  value={address.phone}
                  onChangeText={(text) => setAddress({ ...address, phone: text })}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    addressMode === "location" && styles.inputDisabled,
                  ]}
                  placeholder="Address *"
                  placeholderTextColor={colors.textMuted}
                  value={address.address}
                  onChangeText={(text) => setAddress({ ...address, address: text })}
                  multiline
                  numberOfLines={3}
                  editable={addressMode === "manual"}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.halfInput,
                      addressMode === "location" && styles.inputDisabled,
                    ]}
                    placeholder="City *"
                    placeholderTextColor={colors.textMuted}
                    value={address.city}
                    onChangeText={(text) => setAddress({ ...address, city: text })}
                    editable={addressMode === "manual"}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.halfInput,
                      addressMode === "location" && styles.inputDisabled,
                    ]}
                    placeholder="Pincode *"
                    placeholderTextColor={colors.textMuted}
                    value={address.pincode}
                    onChangeText={(text) => setAddress({ ...address, pincode: text })}
                    keyboardType="number-pad"
                    editable={addressMode === "manual"}
                  />
                </View>
                <TextInput
                  style={[
                    styles.input,
                    addressMode === "location" && styles.inputDisabled,
                  ]}
                  placeholder="Landmark (Optional)"
                  placeholderTextColor={colors.textMuted}
                  value={address.landmark}
                  onChangeText={(text) => setAddress({ ...address, landmark: text })}
                  editable={addressMode === "manual"}
                />
                {addressMode === "location" && (
                  <TouchableOpacity
                    style={styles.editLocationBtn}
                    onPress={() => setAddressMode("manual")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.editLocationText}>Edit Address</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Order Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bag-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Order Items</Text>
              <Text style={styles.itemCount}>({items.length})</Text>
            </View>

            <View style={styles.itemsList}>
              {items.map((item) => {
                const displayPrice = item.offerPrice ?? item.price ?? 0;
                const lineTotal = displayPrice * item.quantity;
                return (
                  <View key={`${item.product._id}-${item.variant}`} style={styles.orderItem}>
                    <Image
                      source={{ uri: item.product?.images?.[0] ?? "" }}
                      style={styles.orderItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemName} numberOfLines={2}>
                        {item.product?.name ?? "Product"}
                      </Text>
                      <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                      <Text style={styles.orderItemPrice}>
                        ₹{lineTotal.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "cod" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("cod")}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionLeft}>
                <Ionicons
                  name="cash-outline"
                  size={24}
                  color={paymentMethod === "cod" ? colors.primary : colors.textMuted}
                />
                <View style={styles.paymentOptionText}>
                  <Text style={[styles.paymentOptionTitle, paymentMethod === "cod" && styles.paymentOptionTitleActive]}>
                    Cash on Delivery
                  </Text>
                  <Text style={styles.paymentOptionSubtitle}>Pay when you receive</Text>
                </View>
              </View>
              {paymentMethod === "cod" && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "online" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("online")}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionLeft}>
                <Ionicons
                  name="card"
                  size={24}
                  color={paymentMethod === "online" ? colors.primary : colors.textMuted}
                />
                <View style={styles.paymentOptionText}>
                  <Text style={[styles.paymentOptionTitle, paymentMethod === "online" && styles.paymentOptionTitleActive]}>
                    Online Payment
                  </Text>
                  <Text style={styles.paymentOptionSubtitle}>Pay securely online</Text>
                </View>
              </View>
              {paymentMethod === "online" && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeText]}>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Place Order Button - Fixed at bottom */}
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total Amount</Text>
            <Text style={styles.footerTotalValue}>₹{total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, placingOrder && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={placingOrder}
            activeOpacity={0.85}
          >
            {placingOrder ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.card} />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    gap: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  shopBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
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
    paddingBottom: 120, // Extra padding to account for fixed footer
  },
  section: {
    backgroundColor: colors.card,
    marginTop: 12,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  itemCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  itemsList: {
    gap: 12,
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
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 2,
  },
  paymentOptionTitleActive: {
    color: colors.primary,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  freeText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 1000,
  },
  footerTotal: {
    gap: 2,
  },
  footerTotalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  placeOrderBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  placeOrderText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  addressModeContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  addressModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addressModeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  addressModeBtnDisabled: {
    opacity: 0.6,
  },
  addressModeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  addressModeTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  addressModeTextDisabled: {
    color: colors.textMuted,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontWeight: "500",
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.7,
  },
  editLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLocationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  loadingAddressesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    justifyContent: "center",
  },
  loadingAddressesText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  savedAddressesContainer: {
    marginBottom: 16,
  },
  savedAddressesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  savedAddressesList: {
    gap: 12,
    paddingRight: SCREEN_PADDING,
  },
  savedAddressCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },
  savedAddressCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  savedAddressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  savedAddressHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  savedAddressName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textMuted,
    flex: 1,
  },
  savedAddressNameActive: {
    color: colors.primary,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.card,
  },
  savedAddressText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  selectedIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  newAddressSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  addNewAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
  },
  addNewAddressText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
});

