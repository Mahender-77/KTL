// app/(tabs)/products.tsx
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/constants/api/axiosInstance";
import { fetchAllPublicProducts } from "@/constants/api/fetchPublicCatalog";
import { Product } from "@/assets/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import Loader from "@/components/common/Loader";

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
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />

        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerBlob} />
          <Text style={styles.headerTitle}>All Products</Text>
          <Text style={styles.headerSubtitle}>Browse the full catalog</Text>
        </View>

        {loading ? (
          <Loader variant="fullscreen" message="Loading products..." />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <ProductGrid products={products} responsive />
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -50,
    right: -40,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    fontWeight: "500",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
});
