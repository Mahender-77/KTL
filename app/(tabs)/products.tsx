// app/(tabs)/products.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/constants/api/axiosInstance";
import { fetchAllPublicProducts } from "@/constants/api/fetchPublicCatalog";
import { Product } from "@/assets/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import Loader from "@/components/common/Loader";
import { Ionicons } from "@expo/vector-icons";

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchAllPublicProducts(axiosInstance);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerTop}>
          <Text style={s.headerTitle}>All Products</Text>
          {!loading && products.length > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{products.length}</Text>
            </View>
          )}
        </View>
        <Text style={s.headerSub}>Browse the full catalogue</Text>
      </View>

      {loading ? (
        <Loader variant="fullscreen" message="Loading products..." />
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
          {products.length > 0 && (
            <View style={s.infoStrip}>
              <Ionicons name="grid-outline" size={13} color={colors.primary} />
              <Text style={s.infoStripText}>
                {products.length} product{products.length !== 1 ? "s" : ""} · prices, offers & availability
              </Text>
            </View>
          )}

          <ProductGrid products={products} responsive />
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

  // Header
  header: {
    backgroundColor: "#0F1923",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 14,
  },
  headerTop: {
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
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Info strip
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