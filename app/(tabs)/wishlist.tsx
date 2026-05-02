// app/(tabs)/wishlist.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import Loader from "@/components/common/Loader";

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { refreshWishlist, totalItems, removeFromWishlist } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchWishlist = async () => {
    if (!isAuthenticated) {
      setProducts([]);
      setLoading(false);
      return;
    }
    try {
      const res = await axiosInstance.get("/api/wishlist");
      const wishlistProducts = res.data.products || [];
      const formattedProducts: Product[] = wishlistProducts
        .filter((p: any) => p && p._id)
        .map((p: any): Product => {
          const rawVariants = Array.isArray(p.variants) ? p.variants : [];
          const validVariants = rawVariants
            .filter((v: any) => v && v._id)
            .map((v: any) => ({
              _id: v._id.toString(),
              type: v.type ?? "pieces",
              value: v.value ?? 1,
              unit: v.unit ?? "pcs",
              price: v.price ?? 0,
              offerPrice: v.offerPrice,
              sku: v.sku,
            }));
          return {
            _id: p._id.toString(),
            name: p.name || "",
            description: p.description || "",
            images: Array.isArray(p.images) ? p.images : [],
            variants: validVariants.length > 0
              ? validVariants
              : [{ type: "pieces" as const, value: 1, unit: "pcs" as const, price: p.pricePerUnit ?? 0 }],
            category: p.category?._id ? p.category._id.toString() : (p.category || ""),
            pricingMode: p.pricingMode ?? "unit",
            baseUnit: p.baseUnit ?? "pcs",
            pricePerUnit: Number(p.pricePerUnit) || 0,
            hasExpiry: Boolean(p.hasExpiry),
            availableQuantity: Number(p.availableQuantity) ?? 0,
          };
        });
      setProducts(formattedProducts);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [isAuthenticated])
  );

  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchWishlist();
    }
  }, [totalItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshWishlist();
    await fetchWishlist();
  }, [refreshWishlist]);

  const handleRemoveFromWishlist = async (productId: string) => {
    Alert.alert(
      "Remove from Wishlist",
      "Are you sure you want to remove this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemoving(productId);
              await removeFromWishlist(productId);
              setProducts((prev) => prev.filter((p) => p._id !== productId));
              await fetchWishlist();
            } catch (err) {
              Alert.alert("Error", "Failed to remove product from wishlist");
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <Text style={s.headerTitle}>Wishlist</Text>
        </View>
        <View style={s.authWrap}>
          <View style={s.authIconWrap}>
            <Ionicons name="heart-outline" size={44} color={colors.primary} />
          </View>
          <Text style={s.authTitle}>Login Required</Text>
          <Text style={s.authSub}>Please login to view and manage your wishlist</Text>
          <TouchableOpacity
            style={s.authBtn}
            onPress={() => router.push("/(auth)/login" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.authBtnText}>Login</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Wishlist</Text>
          {products.length > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{products.length}</Text>
            </View>
          )}
        </View>
        {products.length > 0 && (
          <Text style={s.headerSub}>
            {products.length} {products.length === 1 ? "item" : "items"} saved
          </Text>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <Loader variant="fullscreen" message="Loading wishlist..." />
      ) : products.length === 0 ? (
        <ScrollView
          contentContainerStyle={s.emptyWrap}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={s.emptyIconWrap}>
            <Ionicons name="heart-outline" size={48} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>Nothing saved yet</Text>
          <Text style={s.emptySub}>
            Tap the heart icon on any product to save it here
          </Text>
          <TouchableOpacity
            style={s.shopBtn}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={s.shopBtnText}>Browse Products</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Info strip */}
          <View style={s.infoStrip}>
            <Ionicons name="heart" size={13} color={colors.primary} />
            <Text style={s.infoStripText}>
              Pull down to refresh · Tap heart to remove
            </Text>
          </View>

          <ProductGrid
            products={products}
            onRemove={handleRemoveFromWishlist}
            showRemoveButton={true}
          />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },

  // ── Header ──
  header: {
    backgroundColor: "#0F1923",
    paddingBottom: 14,
    paddingHorizontal: SCREEN_PADDING,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },

  // ── Auth gate ──
  authWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    backgroundColor: "#F4F6F9",
  },
  authIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  authSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  authBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Empty ──
  emptyWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  shopBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── List ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  infoStripText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
});