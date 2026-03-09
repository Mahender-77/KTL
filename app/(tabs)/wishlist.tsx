// app/(tabs)/wishlist.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { Alert } from "react-native";
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
      
      // Transform wishlist products to match Product type
      // Products are already fully populated from backend
      const formattedProducts: Product[] = wishlistProducts
        .filter((p: any) => {
          if (!p || !p._id) {
            console.warn("Invalid product in wishlist:", p);
            return false;
          }
          return true;
        })
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
            variants: validVariants.length > 0 ? validVariants : [{ type: "pieces" as const, value: 1, unit: "pcs" as const, price: p.pricePerUnit ?? 0 }],
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
      console.log("Fetch wishlist error:", err);
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

  // Refresh products when wishlist count changes (e.g., item removed)
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
      "Are you sure you want to remove this product from your wishlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemoving(productId);
              await removeFromWishlist(productId);
              // Remove from local state immediately for better UX
              setProducts((prev) => prev.filter((p) => p._id !== productId));
              // Refresh to ensure sync
              await fetchWishlist();
            } catch (err) {
              console.log("Remove from wishlist error:", err);
              Alert.alert("Error", "Failed to remove product from wishlist");
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={colors.disabled} />
            <Text style={styles.emptyTitle}>Login Required</Text>
            <Text style={styles.emptyText}>
              Please login to view your wishlist
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />

          {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerBlob} />
          <Text style={styles.headerTitle}>My Wishlist</Text>
          <Text style={styles.headerSubtitle}>
            {products.length} {products.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {/* Content */}
        {loading ? (
          <Loader variant="fullscreen" message="Loading wishlist..." />
        ) : products.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={80} color={colors.disabled} />
              <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
              <Text style={styles.emptyText}>
                Start adding products you love to your wishlist
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <ProductGrid
              products={products}
              onRemove={handleRemoveFromWishlist}
              showRemoveButton={true}
            />
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingBottom: 20,
    paddingHorizontal: SCREEN_PADDING,
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
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },
  emptyScroll: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
