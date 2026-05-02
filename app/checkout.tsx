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
  Animated,
  Easing,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Loader from "@/components/common/Loader";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useCart } from "@/context/CartContext";
import { useFeedback } from "@/context/FeedbackContext";
import { coerceNavBooleanOptions } from "@/constants/navigation/coerceNavOptions";
import { parseImageUri } from "@/utils/imageUri";
import {
  fetchOlaAutocomplete,
  fetchOlaPlaceDetails,
  reverseGeocodeWithOla,
  type OlaAutocompleteSuggestion,
  type OlaLocationData,
} from "@/services/olaMaps";

const FREE_DELIVERY_THRESHOLD = 500;

function formatPrice(value: number): string {
  return Math.floor(value).toLocaleString();
}

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
  dealDiscountPercent?: number;
}

function cartLineKey(item: CartItem): string {
  return `${item.product._id}-${item.variant}`;
}

interface Address {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  landmark?: string;
  location?: {
    lat: number;
    lng: number;
  };
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

function extractOrderId(payload: unknown): string | null {
  const p = payload as any;
  const single = p?.order?._id ?? p?.order?.id;
  if (typeof single === "string") return single;
  if (single && typeof single.toString === "function") return String(single.toString());

  const first = Array.isArray(p?.orders) ? p.orders[0] : null;
  const fromList = first?._id ?? first?.id;
  if (typeof fromList === "string") return fromList;
  if (fromList && typeof fromList.toString === "function") return String(fromList.toString());

  return null;
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { refreshCart } = useCart();
  const { showToast, showConfirm } = useFeedback();
  const { buyNowLine: buyNowLineParam } = useLocalSearchParams<{ buyNowLine?: string }>();
  const [items, setItems] = useState<CartItem[]>([]);
  /** Cart lines included in this order total (others stay in cart for later) */
  const [selectedLineKeys, setSelectedLineKeys] = useState<string[]>([]);
  const selectionInitialized = useRef(false);
  const [removingLineKey, setRemovingLineKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [addressMode, setAddressMode] = useState<"saved" | "manual" | "location">("saved");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [storeDeliveryFee, setStoreDeliveryFee] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<OlaAutocompleteSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  /** 1 = address, 2 = payment, 3 = review & place order */
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  /** When editing an existing saved address in manual form — PUT on save/order instead of POST */
  const [editingSavedAddressId, setEditingSavedAddressId] = useState<string | null>(null);

  // Animation refs
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const searchBarWidth = useRef(new Animated.Value(40)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const placeDetailsAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<TextInput>(null);

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
      axiosInstance
        .get("/api/stores/public")
        .then((storeRes) => {
          const fee = storeRes.data?.data?.[0]?.deliveryFee;
          if (typeof fee === "number" && fee >= 0) {
            setStoreDeliveryFee(fee);
          }
        })
        .catch(() => {});
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await axiosInstance.get("/api/addresses");
      setSavedAddresses(res.data || []);
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
          location: undefined,
        });
        setSearchQuery(defaultAddress.address || "");
        setAddressMode("saved");
      } else if (res.data?.length > 0) {
        const firstAddress = res.data[0];
        setSelectedAddressId(firstAddress._id);
        setAddress({
          name: firstAddress.name,
          phone: firstAddress.phone,
          address: firstAddress.address,
          city: firstAddress.city,
          pincode: firstAddress.pincode,
          landmark: firstAddress.landmark || "",
          location: undefined,
        });
        setSearchQuery(firstAddress.address || "");
        setAddressMode("saved");
      }
    } catch (err) {
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

  useEffect(() => {
    if (!items.length) {
      setSelectedLineKeys([]);
      selectionInitialized.current = false;
      return;
    }
    const keys = items.map(cartLineKey);
    if (!selectionInitialized.current) {
      selectionInitialized.current = true;
      const raw = buyNowLineParam != null ? String(buyNowLineParam) : "";
      if (raw) {
        const parts = raw.split("__");
        const pid = parts[0];
        const vid = parts[1] ?? "";
        const target = `${pid}-${vid}`;
        setSelectedLineKeys(keys.includes(target) ? [target] : [...keys]);
      } else {
        setSelectedLineKeys([...keys]);
      }
      return;
    }
    setSelectedLineKeys((prev) => {
      const valid = new Set(keys);
      return prev.filter((k) => valid.has(k));
    });
  }, [items, buyNowLineParam]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      autocompleteAbortRef.current?.abort();
      placeDetailsAbortRef.current?.abort();
      reverseGeocodeAbortRef.current?.abort();
    };
  }, []);

  const openSearchBar = () => {
    setSearchBarOpen(true);
    Animated.parallel([
      Animated.timing(searchBarWidth, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 220,
        delay: 80,
        useNativeDriver: false,
      }),
    ]).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearchBar = () => {
    setShowSuggestions(false);
    setSearchSuggestions([]);
    Animated.parallel([
      Animated.timing(searchOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(searchBarWidth, {
        toValue: 0,
        duration: 220,
        delay: 80,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setSearchBarOpen(false);
    });
  };

  const applyLocationDataToAddress = useCallback((locationData: OlaLocationData) => {
    setAddress((prev) => ({
      ...prev,
      address: locationData.address || prev.address,
      city: locationData.city || prev.city,
      pincode: locationData.pincode || prev.pincode,
      landmark: locationData.landmark || prev.landmark || "",
      location: {
        lat: locationData.lat,
        lng: locationData.lng,
      },
    }));
    setSearchQuery(locationData.address || "");
  }, []);

  const includedItems = useMemo(
    () => items.filter((item) => selectedLineKeys.includes(cartLineKey(item))),
    [items, selectedLineKeys]
  );
  const includedQtyTotal = useMemo(
    () => includedItems.reduce((sum, item) => sum + item.quantity, 0),
    [includedItems]
  );
  const subtotal = includedItems.reduce((sum, item) => {
    const price = item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const baseDeliveryFee = storeDeliveryFee != null ? storeDeliveryFee : 40;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : baseDeliveryFee;
  const total = subtotal + deliveryFee;
  const hasItemsInOrder = includedItems.length > 0;
  const otherCartLines = items.length - includedItems.length;

  const toggleLineInOrder = useCallback((key: string) => {
    setSelectedLineKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleRemoveCartLine = useCallback(async (productId: string, variantId: string) => {
    const key = `${productId}-${variantId}`;
    try {
      setRemovingLineKey(key);
      const res = await axiosInstance.delete("/api/cart/remove", {
        data: { productId, variantId },
      });
      setItems(res.data.items ?? []);
      await refreshCart();
      setSelectedLineKeys((prev) => prev.filter((k) => k !== key));
    } catch {
      showToast({
        variant: "error",
        title: "Error",
        message: "Could not remove item from cart.",
      });
    } finally {
      setRemovingLineKey(null);
    }
  }, [refreshCart, showToast]);

  const handleAddressSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    autocompleteAbortRef.current?.abort();
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setSearchingPlaces(false);
      return;
    }
    setSearchingPlaces(true);
    searchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      autocompleteAbortRef.current = controller;
      try {
        const suggestions = await fetchOlaAutocomplete(query, controller.signal);
        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 400);
  }, []);

  const handleSelectSuggestion = useCallback(async (suggestion: OlaAutocompleteSuggestion) => {
    placeDetailsAbortRef.current?.abort();
    const controller = new AbortController();
    placeDetailsAbortRef.current = controller;
    try {
      setLoadingPlaceDetails(true);
      const locationData = await fetchOlaPlaceDetails(suggestion.id, controller.signal);
      applyLocationDataToAddress(locationData);
      setEditingSavedAddressId(null);
      setAddressMode("manual");
      setShowSuggestions(false);
      setSearchSuggestions([]);
      closeSearchBar();
    } catch {
      showToast({
        variant: "error",
        title: "Error",
        message: "Could not fetch place details. Please try another address.",
      });
    } finally {
      setLoadingPlaceDetails(false);
    }
  }, [applyLocationDataToAddress, showToast]);

  const handleGetCurrentLocation = useCallback(async () => {
    try {
      setGettingLocation(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast({
          variant: "warning",
          title: "Permission denied",
          message: "Location permission is required.",
        });
        setLocationError("Location permission denied");
        setGettingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      const addressData = await reverseGeocodeWithOla(latitude, longitude);
      if (addressData) {
        applyLocationDataToAddress(addressData);
        setEditingSavedAddressId(null);
        setAddressMode("location");
        setSelectedAddressId(null);
      } else {
        setLocationError("Could not fetch address. Please enter manually.");
        showToast({
          variant: "warning",
          title: "Address not found",
          message: "Could not fetch your address from location. Please enter it manually.",
        });
      }
    } catch (error) {
      setLocationError("Failed to get location. Please try again.");
      showToast({
        variant: "error",
        title: "Error",
        message: "Failed to get your current location. Please enter address manually.",
      });
    } finally {
      setGettingLocation(false);
    }
  }, [applyLocationDataToAddress, showToast]);

  const handleSelectSavedAddress = (savedAddr: SavedAddress) => {
    setEditingSavedAddressId(null);
    setSelectedAddressId(savedAddr._id);
    setAddress({
      name: savedAddr.name,
      phone: savedAddr.phone,
      address: savedAddr.address,
      city: savedAddr.city,
      pincode: savedAddr.pincode,
      landmark: savedAddr.landmark || "",
      location: undefined,
    });
    setSearchQuery(savedAddr.address || "");
    setAddressMode("saved");
  };

  const handleEditSavedAddress = (savedAddr: SavedAddress) => {
    setSelectedAddressId(savedAddr._id);
    setAddress({
      name: savedAddr.name,
      phone: savedAddr.phone,
      address: savedAddr.address,
      city: savedAddr.city,
      pincode: savedAddr.pincode,
      landmark: savedAddr.landmark || "",
      location: undefined,
    });
    setSearchQuery(savedAddr.address || "");
    setAddressMode("manual");
    setEditingSavedAddressId(savedAddr._id);
    setLocationError(null);
  };

  const isAddressComplete = useCallback(() => {
    const a = address;
    return Boolean(
      a.name?.trim() &&
        a.phone?.trim() &&
        a.address?.trim() &&
        a.city?.trim() &&
        a.pincode?.trim()
    );
  }, [address]);

  const canContinueToPayment = useMemo(() => {
    if (loadingAddresses) return false;
    if (!isAddressComplete()) return false;
    if (addressMode === "saved") {
      if (savedAddresses.length === 0) return false;
      return (
        selectedAddressId != null &&
        savedAddresses.some((a) => a._id === selectedAddressId)
      );
    }
    return true;
  }, [
    loadingAddresses,
    isAddressComplete,
    addressMode,
    savedAddresses,
    selectedAddressId,
    address,
  ]);

  const goContinueToPayment = useCallback(() => {
    Keyboard.dismiss();
    if (!hasItemsInOrder) {
      showToast({
        variant: "warning",
        title: "No items in this order",
        message: "Include at least one cart line in this order before continuing.",
      });
      return;
    }
    if (!canContinueToPayment) {
      showToast({
        variant: "warning",
        title: "Select or complete address",
        message:
          savedAddresses.length > 0 && addressMode === "saved"
            ? "Tap a saved address to deliver there, or add a new address."
            : "Please enter name, phone, full address, city, and pincode.",
      });
      return;
    }
    setCheckoutStep(2);
  }, [canContinueToPayment, savedAddresses.length, addressMode, hasItemsInOrder, showToast]);

  const goContinueToReview = useCallback(() => {
    Keyboard.dismiss();
    if (includedItems.length === 0) {
      showToast({
        variant: "warning",
        title: "No items in this order",
        message: "Include at least one product in this order, or add items from your cart.",
      });
      return;
    }
    setCheckoutStep(3);
  }, [includedItems.length, showToast]);

  const goBackStep = useCallback(() => {
    Keyboard.dismiss();
    setCheckoutStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (checkoutStep > 1) {
      goBackStep();
    } else {
      router.back();
    }
  }, [checkoutStep, goBackStep]);

  const handleDeleteSavedAddress = useCallback(
    (addressId: string) => {
      showConfirm({
        title: "Delete address",
        message: "Are you sure you want to delete this address?",
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        destructive: true,
        onConfirm: async () => {
          try {
            setDeletingAddressId(addressId);
            await axiosInstance.delete(`/api/addresses/${addressId}`);
            if (selectedAddressId === addressId) setSelectedAddressId(null);
            if (editingSavedAddressId === addressId) setEditingSavedAddressId(null);
            await fetchSavedAddresses();
          } catch {
            showToast({
              variant: "error",
              title: "Error",
              message: "Failed to delete address. Please try again.",
            });
          } finally {
            setDeletingAddressId(null);
          }
        },
      });
    },
    [selectedAddressId, editingSavedAddressId, showConfirm, showToast]
  );

  const handlePlaceOrder = async () => {
    if (checkoutStep !== 3) {
      return;
    }
    if (includedItems.length === 0) {
      showToast({
        variant: "warning",
        title: "No items in this order",
        message: "Include at least one product to place this order.",
      });
      return;
    }
    if (!address.name || !address.phone || !address.address || !address.city || !address.pincode) {
      showToast({
        variant: "warning",
        title: "Validation error",
        message: "Please fill all required fields.",
      });
      return;
    }
    try {
      setPlacingOrder(true);
      if (addressMode !== "saved") {
        try {
          if (editingSavedAddressId) {
            await axiosInstance.put(`/api/addresses/${editingSavedAddressId}`, {
              ...address,
            });
          } else {
            await axiosInstance.post("/api/addresses", {
              ...address,
              isDefault: savedAddresses.length === 0,
            });
          }
          setEditingSavedAddressId(null);
          await fetchSavedAddresses();
        } catch (err) {}
      }
      const orderData = {
        items: includedItems.map((item) => ({
          product: item.product._id,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price ?? 0,
        })),
        totalAmount: total,
        address: address.location
          ? { ...address, location: { lat: address.location.lat, lng: address.location.lng } }
          : { ...address },
        paymentMethod: paymentMethod,
      };
      const created = await axiosInstance.post("/api/orders", orderData);

      // Local confirmation notification (reliable in dev/emulators; server push may not deliver there).
      try {
        const orderId = extractOrderId(created.data);
        const ref = orderId ? `#${orderId.slice(-8).toUpperCase()}` : "";
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Order placed",
            body: `Your order ${ref} was placed successfully.`.trim(),
            data: { type: "order_placed", orderId: orderId ?? "" },
            sound: "default",
          },
          trigger: null,
        });
      } catch {
        /* best-effort */
      }
      await Promise.allSettled(
        includedItems.map((line) =>
          axiosInstance.delete("/api/cart/remove", {
            data: { productId: line.product._id, variantId: line.variant },
          })
        )
      );
      await refreshCart();
      router.replace("/orders");
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = data?.message ?? err?.message ?? "Failed to place order. Please try again.";
      if (data?.detail?.errors) {
        const errList = Object.values(data.detail.errors).flat();
        if (errList.length) msg = String(errList[0]);
      }
      showToast({
        variant: "error",
        title: "Error",
        message: msg,
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) return <Loader variant="fullscreen" message="Loading checkout..." />;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="cart-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some items to get started</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.shopBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={handleHeaderBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerItemCount}>
              {includedQtyTotal} in order
              {otherCartLines > 0 ? ` · ${items.length} in cart` : ""}
            </Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressBar}>
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                checkoutStep === 1 && styles.progressDotActive,
                checkoutStep > 1 && styles.progressDotDone,
              ]}
            >
              <Ionicons
                name={checkoutStep > 1 ? "checkmark" : "location"}
                size={10}
                color="#fff"
              />
            </View>
            <Text
              style={[
                styles.progressLabel,
                (checkoutStep === 1 || checkoutStep > 1) && styles.progressLabelActive,
              ]}
            >
              Address
            </Text>
          </View>
          <View style={[styles.progressLine, checkoutStep >= 2 && styles.progressLineDone]} />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                checkoutStep === 2 && styles.progressDotActive,
                checkoutStep > 2 && styles.progressDotDone,
                checkoutStep < 2 && styles.progressDotFuture,
              ]}
            >
              <Ionicons
                name={checkoutStep > 2 ? "checkmark" : "card"}
                size={10}
                color="#fff"
              />
            </View>
            <Text
              style={[
                styles.progressLabel,
                (checkoutStep === 2 || checkoutStep > 2) && styles.progressLabelActive,
              ]}
            >
              Payment
            </Text>
          </View>
          <View style={[styles.progressLine, checkoutStep >= 3 && styles.progressLineDone]} />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                checkoutStep === 3 && styles.progressDotActive,
                checkoutStep < 3 && styles.progressDotFuture,
              ]}
            >
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
            <Text style={[styles.progressLabel, checkoutStep === 3 && styles.progressLabelActive]}>
              Confirm
            </Text>
          </View>
        </View>
        <Text style={styles.stepSubtitle}>
          {checkoutStep === 1 && "Add or choose where we should deliver"}
          {checkoutStep === 2 && "Choose how you would like to pay"}
          {checkoutStep === 3 && "Review everything, then place your order"}
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── DELIVERY ADDRESS (step 1) ── */}
          {checkoutStep === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>
                  {editingSavedAddressId ? "Edit address" : "Delivery Address"}
                </Text>
              </View>
              {/* Search / GPS / Add — hidden while editing one address (form only) */}
              {savedAddresses.length > 0 && !editingSavedAddressId && (
                <View style={styles.cardActions}>
                  {/* Search icon */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => {
                      setEditingSavedAddressId(null);
                      setAddressMode("manual");
                      openSearchBar();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  {/* GPS icon */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    activeOpacity={0.7}
                  >
                    {gettingLocation ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="navigate" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  {/* Add new address */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => {
                      setEditingSavedAddressId(null);
                      setAddressMode("manual");
                      setSelectedAddressId(null);
                      setAddress({ name: "", phone: "", address: "", city: "", pincode: "", landmark: "", location: undefined });
                      setSearchQuery("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Saved list / empty — skipped while editing (form only, no cards with Edit/Delete) */}
            {loadingAddresses ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading addresses...</Text>
              </View>
            ) : editingSavedAddressId ? null : savedAddresses.length > 0 ? (
              <View style={styles.savedListVertical}>
                {savedAddresses.map((savedAddr) => {
                  const isActive = selectedAddressId === savedAddr._id;
                  return (
                    <View
                      key={savedAddr._id}
                      style={[styles.savedCardWrap, isActive && styles.savedCardWrapActive]}
                    >
                      <TouchableOpacity
                        style={styles.savedCardTap}
                        onPress={() => handleSelectSavedAddress(savedAddr)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.savedCardTop}>
                          <Text style={[styles.savedCardName, isActive && styles.savedCardNameActive]} numberOfLines={1}>
                            {savedAddr.name}
                          </Text>
                          {savedAddr.isDefault && (
                            <View style={styles.defaultPill}>
                              <Text style={styles.defaultPillText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.savedCardAddress} numberOfLines={2}>
                          {savedAddr.address}
                        </Text>
                        <Text style={styles.savedCardCity}>
                          {savedAddr.city} · {savedAddr.pincode}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.savedCardFooter}>
                        <TouchableOpacity
                          style={styles.savedCardActionBtn}
                          onPress={() => handleEditSavedAddress(savedAddr)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={15} color={colors.primary} />
                          <Text style={styles.savedCardActionText}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.savedCardActionSep} />
                        <TouchableOpacity
                          style={styles.savedCardActionBtn}
                          onPress={() => handleDeleteSavedAddress(savedAddr._id)}
                          disabled={deletingAddressId === savedAddr._id}
                          activeOpacity={0.7}
                        >
                          {deletingAddressId === savedAddr._id ? (
                            <ActivityIndicator size="small" color={colors.error} />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={15} color={colors.error} />
                              <Text style={styles.savedCardActionTextDanger}>Delete</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.savedEmpty}>
                <View style={styles.savedEmptyIconWrap}>
                  <Ionicons name="location-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.savedEmptyTitle}>Where should we deliver?</Text>
                <Text style={styles.savedEmptySub}>
                  You have no saved addresses yet. Pick one of the options below to add your first delivery address.
                </Text>
                <View style={styles.emptyAddressActions}>
                  <TouchableOpacity
                    style={styles.emptyAddressBtn}
                    onPress={() => {
                      setEditingSavedAddressId(null);
                      setAddressMode("manual");
                      openSearchBar();
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.emptyAddressBtnIcon}>
                      <Ionicons name="search" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.emptyAddressBtnTextCol}>
                      <Text style={styles.emptyAddressBtnTitle}>Search address</Text>
                      <Text style={styles.emptyAddressBtnHint}>Find by area, street, or landmark</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emptyAddressBtn}
                    onPress={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    activeOpacity={0.75}
                  >
                    <View style={styles.emptyAddressBtnIcon}>
                      {gettingLocation ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="navigate" size={20} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.emptyAddressBtnTextCol}>
                      <Text style={styles.emptyAddressBtnTitle}>Use current location</Text>
                      <Text style={styles.emptyAddressBtnHint}>We will fill the address from GPS</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emptyAddressBtn}
                    onPress={() => {
                      setEditingSavedAddressId(null);
                      setAddressMode("manual");
                      setSelectedAddressId(null);
                      setAddress({
                        name: "",
                        phone: "",
                        address: "",
                        city: "",
                        pincode: "",
                        landmark: "",
                        location: undefined,
                      });
                      setSearchQuery("");
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.emptyAddressBtnIcon}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.emptyAddressBtnTextCol}>
                      <Text style={styles.emptyAddressBtnTitle}>Enter address manually</Text>
                      <Text style={styles.emptyAddressBtnHint}>Type name, phone, and full address</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {locationError && addressMode !== "saved" && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{locationError}</Text>
              </View>
            )}

            {/* New address / edit saved — full card when editing (no list above) */}
            {addressMode !== "saved" && (
              <View
                style={[
                  styles.form,
                  savedAddresses.length > 0 && !editingSavedAddressId && styles.formBelowSavedList,
                ]}
              >
                {/* Search bar with animation */}
                <View style={styles.searchRow}>
                  {searchBarOpen ? (
                    <View style={styles.searchExpandedWrap}>
                      <Animated.View style={[styles.searchExpandedBar, { opacity: searchOpacity }]}>
                        <Ionicons name="search" size={15} color={colors.textMuted} />
                        <TextInput
                          ref={searchInputRef}
                          style={styles.searchExpandedInput}
                          placeholder="Search area, street, landmark..."
                          placeholderTextColor={colors.textMuted}
                          value={searchQuery}
                          onChangeText={handleAddressSearchChange}
                          autoFocus
                        />
                        {(searchingPlaces || loadingPlaceDetails) && (
                          <ActivityIndicator size="small" color={colors.primary} />
                        )}
                        <TouchableOpacity onPress={closeSearchBar} activeOpacity={0.7}>
                          <Ionicons name="close" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </Animated.View>
                      {showSuggestions && (
                        <View style={styles.suggestionsBox}>
                          {searchingPlaces ? (
                            <View style={styles.skeletonWrap}>
                              <View style={styles.skeleton} />
                              <View style={styles.skeleton} />
                              <View style={[styles.skeleton, { width: "55%" }]} />
                            </View>
                          ) : searchSuggestions.length === 0 ? (
                            <Text style={styles.noResults}>No suggestions found</Text>
                          ) : (
                            searchSuggestions.map((item) => (
                              <TouchableOpacity
                                key={item.id}
                                style={styles.suggestionRow}
                                onPress={() => handleSelectSuggestion(item)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.suggestionDot} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.suggestionTitle}>{item.title}</Text>
                                  <Text style={styles.suggestionSub} numberOfLines={1}>{item.description}</Text>
                                </View>
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.formToolbar}>
                      <TouchableOpacity style={styles.toolbarBtn} onPress={openSearchBar} activeOpacity={0.7}>
                        <Ionicons name="search" size={15} color={colors.primary} />
                        <Text style={styles.toolbarBtnText}>Search address</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toolbarBtn, styles.toolbarBtnGps]}
                        onPress={handleGetCurrentLocation}
                        disabled={gettingLocation}
                        activeOpacity={0.7}
                      >
                        {gettingLocation ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="navigate" size={15} color={colors.primary} />
                        )}
                        <Text style={styles.toolbarBtnText}>My Location</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.formGrid}>
                  <TextInput
                    style={[styles.formInput, styles.formInputFull]}
                    placeholder="Full Name *"
                    placeholderTextColor={colors.textMuted}
                    value={address.name}
                    onChangeText={(text) => setAddress({ ...address, name: text })}
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputFull]}
                    placeholder="Phone Number *"
                    placeholderTextColor={colors.textMuted}
                    value={address.phone}
                    onChangeText={(text) => setAddress({ ...address, phone: text })}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[
                      styles.formInput,
                      styles.formInputFull,
                      styles.formTextArea,
                      addressMode === "location" && styles.inputLocationLocked,
                      addressMode === "location" && styles.formTextAreaLocation,
                    ]}
                    placeholder="Address *"
                    placeholderTextColor={colors.textMuted}
                    value={address.address}
                    onChangeText={(text) => setAddress({ ...address, address: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={addressMode === "manual"}
                    showSoftInputOnFocus={addressMode === "manual"}
                    selectTextOnFocus={addressMode === "manual"}
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf, addressMode === "location" && styles.inputLocationLocked]}
                    placeholder="City *"
                    placeholderTextColor={colors.textMuted}
                    value={address.city}
                    onChangeText={(text) => setAddress({ ...address, city: text })}
                    editable={addressMode === "manual"}
                    showSoftInputOnFocus={addressMode === "manual"}
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputHalf, addressMode === "location" && styles.inputLocationLocked]}
                    placeholder="Pincode *"
                    placeholderTextColor={colors.textMuted}
                    value={address.pincode}
                    onChangeText={(text) => setAddress({ ...address, pincode: text })}
                    keyboardType="number-pad"
                    editable={addressMode === "manual"}
                    showSoftInputOnFocus={addressMode === "manual"}
                  />
                  <TextInput
                    style={[styles.formInput, styles.formInputFull, addressMode === "location" && styles.inputLocationLocked]}
                    placeholder="Landmark (Optional)"
                    placeholderTextColor={colors.textMuted}
                    value={address.landmark}
                    onChangeText={(text) => setAddress({ ...address, landmark: text })}
                    editable={addressMode === "manual"}
                    showSoftInputOnFocus={addressMode === "manual"}
                  />
                </View>

                {addressMode === "location" && (
                  <TouchableOpacity style={styles.editLocationBtn} onPress={() => setAddressMode("manual")} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={14} color={colors.primary} />
                    <Text style={styles.editLocationText}>Edit this address</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cancelAddBtn}
                  onPress={() => {
                    if (editingSavedAddressId && selectedAddressId) {
                      const revert = savedAddresses.find((a) => a._id === selectedAddressId);
                      if (revert) {
                        setAddress({
                          name: revert.name,
                          phone: revert.phone,
                          address: revert.address,
                          city: revert.city,
                          pincode: revert.pincode,
                          landmark: revert.landmark || "",
                          location: undefined,
                        });
                        setSearchQuery(revert.address || "");
                      } else {
                        setSearchQuery("");
                      }
                    } else {
                      setSearchQuery("");
                    }
                    setEditingSavedAddressId(null);
                    setAddressMode("saved");
                    setShowSuggestions(false);
                    if (searchBarOpen) closeSearchBar();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelAddText}>
                    {savedAddresses.length > 0 ? "← Back to saved addresses" : "← Back"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          )}

          {/* ── REVIEW: summary of address & payment (step 3) ── */}
          {checkoutStep === 3 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Order summary</Text>
                </View>
              </View>
              <View style={styles.reviewBlock}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Deliver to</Text>
                  <TouchableOpacity onPress={() => setCheckoutStep(1)} activeOpacity={0.7}>
                    <Text style={styles.reviewChange}>Change</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewName}>{address.name || "—"} · {address.phone || "—"}</Text>
                <Text style={styles.reviewAddr} numberOfLines={3}>
                  {address.address || "—"}, {address.city || "—"} — {address.pincode || "—"}
                </Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewBlock}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Payment</Text>
                  <TouchableOpacity onPress={() => setCheckoutStep(2)} activeOpacity={0.7}>
                    <Text style={styles.reviewChange}>Change</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewPaymentValue}>
                  {paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (UPI, Card, Net Banking)"}
                </Text>
              </View>
            </View>
          )}

          {/* ── ORDER ITEMS (step 3) ── */}
          {checkoutStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="bag" size={14} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Order Items</Text>
              </View>
              <Text style={styles.cardBadge}>
                {includedItems.length}/{items.length}
              </Text>
            </View>
            {otherCartLines > 0 ? (
              <Text style={styles.orderItemsHint}>
                Toggle lines to include in this order. Items left out stay in your cart.
              </Text>
            ) : null}
            <View style={styles.itemsList}>
              {items.map((item) => {
                const key = cartLineKey(item);
                const inOrder = selectedLineKeys.includes(key);
                const displayPrice = item.price ?? 0;
                const lineTotal = displayPrice * item.quantity;
                const imageUri = parseImageUri(item.product?.images?.[0]);
                const busy = removingLineKey === key;
                return (
                  <View
                    key={key}
                    style={[styles.orderItem, !inOrder && styles.orderItemDimmed]}
                  >
                    <TouchableOpacity
                      style={styles.includeToggle}
                      onPress={() => toggleLineInOrder(key)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Ionicons
                        name={inOrder ? "checkbox" : "square-outline"}
                        size={22}
                        color={inOrder ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.orderItemImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.orderItemImg, styles.orderItemImgEmpty]}>
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.orderItemInfo}>
                      <Text style={styles.orderItemName} numberOfLines={2}>
                        {item.product?.name ?? "Product"}
                      </Text>
                      <Text style={styles.orderItemVariant}>{item.variant}</Text>
                      <View style={styles.orderItemBottom}>
                        <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                        <Text style={styles.orderItemPrice}>₹{formatPrice(lineTotal)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.orderLineRemove}
                      onPress={() =>
                        showConfirm({
                          title: "Remove from cart?",
                          message: "This removes the product from your cart.",
                          cancelLabel: "Cancel",
                          confirmLabel: "Remove",
                          destructive: true,
                          onConfirm: () =>
                            void handleRemoveCartLine(item.product._id, item.variant),
                        })
                      }
                      disabled={busy}
                      activeOpacity={0.7}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
          )}

          {/* ── PAYMENT METHOD (step 2) ── */}
          {checkoutStep === 2 && (
          <View style={styles.card}>
            <View style={styles.paymentStepAddr}>
              <View style={styles.paymentStepAddrHeader}>
                <View style={styles.paymentStepAddrHeaderLeft}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={styles.paymentStepAddrLabel}>Delivering to</Text>
                </View>
                <TouchableOpacity onPress={() => setCheckoutStep(1)} activeOpacity={0.7}>
                  <Text style={styles.paymentStepAddrChange}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.paymentStepAddrName} numberOfLines={1}>
                {address.name || "—"} · {address.phone || "—"}
              </Text>
              <Text style={styles.paymentStepAddrLine} numberOfLines={3}>
                {address.address || "—"}
              </Text>
              <Text style={styles.paymentStepAddrMeta}>
                {address.city || "—"} — {address.pincode || "—"}
              </Text>
            </View>

            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="card" size={14} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Payment Method</Text>
              </View>
            </View>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[styles.paymentOpt, paymentMethod === "cod" && styles.paymentOptActive]}
                onPress={() => setPaymentMethod("cod")}
                activeOpacity={0.75}
              >
                <View style={styles.paymentOptIcon}>
                  <Ionicons name="cash-outline" size={20} color={paymentMethod === "cod" ? colors.primary : colors.textMuted} />
                </View>
                <View style={styles.paymentOptContent}>
                  <Text style={[styles.paymentOptTitle, paymentMethod === "cod" && styles.paymentOptTitleActive]}>
                    Cash on Delivery
                  </Text>
                  <Text style={styles.paymentOptSub}>Pay when you receive</Text>
                </View>
                <View style={[styles.radio, paymentMethod === "cod" && styles.radioActive]}>
                  {paymentMethod === "cod" && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              <View style={styles.paymentDivider} />

              <TouchableOpacity
                style={[styles.paymentOpt, paymentMethod === "online" && styles.paymentOptActive]}
                onPress={() => setPaymentMethod("online")}
                activeOpacity={0.75}
              >
                <View style={styles.paymentOptIcon}>
                  <Ionicons name="phone-portrait-outline" size={20} color={paymentMethod === "online" ? colors.primary : colors.textMuted} />
                </View>
                <View style={styles.paymentOptContent}>
                  <Text style={[styles.paymentOptTitle, paymentMethod === "online" && styles.paymentOptTitleActive]}>
                    Online Payment
                  </Text>
                  <Text style={styles.paymentOptSub}>UPI, Card, Net Banking</Text>
                </View>
                <View style={[styles.radio, paymentMethod === "online" && styles.radioActive]}>
                  {paymentMethod === "online" && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* ── PRICE DETAILS (step 3) ── */}
          {checkoutStep === 3 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="receipt" size={14} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Price Details</Text>
              </View>
            </View>
            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Price ({includedQtyTotal} {includedQtyTotal === 1 ? "item" : "items"})
                </Text>
                <Text style={styles.summaryValue}>₹{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Charges</Text>
                <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeLabel]}>
                  {deliveryFee === 0 ? "FREE" : `₹${formatPrice(deliveryFee)}`}
                </Text>
              </View>
              {deliveryFee === 0 && (
                <View style={styles.freeDeliveryBanner}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={styles.freeDeliveryText}>You saved ₹{formatPrice(baseDeliveryFee)} on delivery!</Text>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{formatPrice(total)}</Text>
              </View>
            </View>
          </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ── FOOTER (step-specific) ── */}
        {checkoutStep === 1 && (
          <View style={[styles.footer, styles.footerCol, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.footerStep1Top}>
              <View>
                <Text style={styles.footerStepBadge}>Step 1 of 3 · Address</Text>
                <Text style={styles.footerTotal}>₹{formatPrice(total)}</Text>
                <Text style={styles.footerItems}>
                  {includedQtyTotal} in order
                  {otherCartLines > 0 ? ` · ${otherCartLines} only in cart` : ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                (!canContinueToPayment || placingOrder || !hasItemsInOrder) && styles.placeOrderBtnDisabled,
              ]}
              onPress={goContinueToPayment}
              disabled={placingOrder || !canContinueToPayment || !hasItemsInOrder}
              activeOpacity={0.85}
            >
              <Text style={styles.placeOrderText}>Continue to payment</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {checkoutStep === 2 && (
          <View style={[styles.footer, styles.footerRowBetween, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.footerBackOutline} onPress={goBackStep} activeOpacity={0.75}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
              <Text style={styles.footerBackOutlineText}>Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                styles.footerFlexBtn,
                (placingOrder || !hasItemsInOrder) && styles.placeOrderBtnDisabled,
              ]}
              onPress={goContinueToReview}
              disabled={placingOrder || !hasItemsInOrder}
              activeOpacity={0.85}
            >
              <Text style={styles.placeOrderText}>Continue to review</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {checkoutStep === 3 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerTotal}>₹{formatPrice(total)}</Text>
              <Text style={styles.footerItems}>
                {includedQtyTotal} in order
                {otherCartLines > 0 ? ` · ${otherCartLines} in cart` : ""} ·{" "}
                {paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.placeOrderBtn,
                (placingOrder || !hasItemsInOrder) && styles.placeOrderBtnDisabled,
              ]}
              onPress={handlePlaceOrder}
              disabled={placingOrder || !hasItemsInOrder}
              activeOpacity={0.85}
            >
              {placingOrder ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.placeOrderText}>Place order</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },

  // ── EMPTY ──
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#F4F6F9",
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  shopBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── HEADER ──
  header: {
    backgroundColor: "#0F1923",
    paddingBottom: 14,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerRight: {},
  headerItemCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },

  // ── PROGRESS ──
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1923",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 16,
    paddingTop: 4,
  },
  progressStep: {
    alignItems: "center",
    gap: 4,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
  },
  progressLabelActive: {
    color: "rgba(255,255,255,0.75)",
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 8,
    marginBottom: 14,
  },
  progressDotDone: {
    backgroundColor: colors.success,
  },
  progressDotFuture: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressLineDone: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  stepSubtitle: {
    backgroundColor: "#0F1923",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 14,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
    lineHeight: 17,
  },

  // ── REVIEW (step 3) ──
  reviewBlock: {
    gap: 6,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reviewChange: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  reviewName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  reviewAddr: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "#F4F6F9",
    marginVertical: 14,
  },
  reviewPaymentValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  /** Step 2 — address recap above payment options */
  paymentStepAddr: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  paymentStepAddrHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentStepAddrHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paymentStepAddrLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  paymentStepAddrChange: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  paymentStepAddrName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  paymentStepAddrLine: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  paymentStepAddrMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 6,
  },

  // ── SCROLL ──
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 20 },

  // ── CARD ──
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // ── LOADING ──
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── SAVED ADDRESSES ──
  savedListVertical: {
    gap: 12,
  },
  savedCardWrap: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  savedCardWrapActive: {
    borderColor: colors.primary,
    backgroundColor: "#F0F4FF",
  },
  savedCardTap: {
    padding: 12,
    paddingBottom: 10,
    position: "relative",
  },
  savedCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  savedCardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  savedCardActionSep: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E8ECF0",
  },
  savedCardActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  savedCardActionTextDanger: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.error,
  },
  savedEmpty: {
    alignItems: "stretch",
    paddingTop: 8,
    paddingBottom: 4,
    gap: 14,
  },
  savedEmptyIconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  savedEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  savedEmptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  emptyAddressActions: {
    gap: 10,
    marginTop: 4,
  },
  emptyAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    backgroundColor: "#FAFBFC",
  },
  emptyAddressBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAddressBtnTextCol: {
    flex: 1,
    minWidth: 0,
  },
  emptyAddressBtnTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  emptyAddressBtnHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  savedCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  savedCardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  savedCardNameActive: {
    color: colors.primary,
  },
  defaultPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  savedCardAddress: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 3,
  },
  savedCardCity: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },

  // ── ERROR ──
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },

  // ── FORM ──
  form: {
    gap: 0,
  },
  /** Spacing when manual form appears under the saved list (add new / search / GPS) */
  formBelowSavedList: {
    marginTop: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F4F6F9",
  },
  searchRow: {
    marginBottom: 12,
    zIndex: 10,
  },
  searchExpandedWrap: {
    zIndex: 10,
  },
  searchExpandedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F6F9",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    height: 44,
  },
  searchExpandedInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  suggestionsBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F6F9",
  },
  suggestionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 1,
  },
  suggestionSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  noResults: {
    fontSize: 12,
    color: colors.textMuted,
    padding: 14,
    textAlign: "center",
  },
  skeletonWrap: {
    padding: 12,
    gap: 8,
  },
  skeleton: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8ECF0",
    width: "100%",
  },
  formToolbar: {
    flexDirection: "row",
    gap: 8,
  },
  toolbarBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#EEF2FF",
  },
  toolbarBtnGps: {},
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  formInputFull: {
    width: "100%",
  },
  formInputHalf: {
    flex: 1,
  },
  formTextArea: {
    minHeight: 64,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  /** Extra height when address comes from GPS so long formatted_address strings are not clipped */
  formTextAreaLocation: {
    minHeight: 96,
  },
  /** GPS-filled fields: readable text (no opacity fade); RN greys out disabled TextInputs without explicit color */
  inputLocationLocked: {
    backgroundColor: "#EEF4FF",
    borderColor: "#C7D7F5",
    color: colors.textPrimary,
    opacity: 1,
  },
  editLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editLocationText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  cancelAddBtn: {
    marginTop: 12,
    paddingVertical: 4,
  },
  cancelAddText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },

  // ── ORDER ITEMS ──
  itemsList: {
    gap: 10,
  },
  orderItemsHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: -6,
  },
  orderItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F6F9",
    alignItems: "flex-start",
  },
  orderItemDimmed: {
    opacity: 0.55,
  },
  includeToggle: {
    justifyContent: "center",
    paddingTop: 16,
  },
  orderLineRemove: {
    paddingTop: 6,
    paddingLeft: 2,
  },
  orderItemImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F4F6F9",
  },
  orderItemImgEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
    lineHeight: 18,
  },
  orderItemVariant: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  orderItemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderItemQty: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  // ── PAYMENT ──
  paymentOptions: {},
  paymentOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  paymentOptActive: {},
  paymentOptIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F4F6F9",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentOptContent: {
    flex: 1,
  },
  paymentOptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 2,
  },
  paymentOptTitleActive: {
    color: colors.textPrimary,
  },
  paymentOptSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: "#F4F6F9",
  },

  // ── SUMMARY ──
  summaryRows: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  freeLabel: {
    color: colors.success,
    fontWeight: "800",
  },
  freeDeliveryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  freeDeliveryText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F4F6F9",
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // ── FOOTER ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EAEDF2",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 1000,
  },
  footerInfo: {
    gap: 2,
  },
  footerTotal: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  footerItems: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  placeOrderBtn: {
    flex: 1,
    height: 50,
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
  placeOrderBtnDisabled: {
    opacity: 0.65,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footerCol: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  footerStep1Top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  footerStepBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 4,
  },
  footerRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerBackOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "#fff",
  },
  footerBackOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  footerFlexBtn: {
    flex: 1,
    minWidth: 0,
  },
});