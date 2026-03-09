import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import ProductGrid from "@/components/product/ProductGrid";
import Loader from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";

type SearchByQuery = {
  mode: "query";
  /** Free-text query. Backend should match name, tags, category, etc. */
  query: string;
};

type SearchByCategory = {
  mode: "category";
  /** Category id. Backend is expected to return products of this category and its subcategories. */
  categoryId: string;
  categoryName?: string;
};

export type SearchContext = SearchByQuery | SearchByCategory;

type Props = {
  context: SearchContext;
};

export default function SearchResults({ context }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = "/api/products/public";
        const params: Record<string, string> = {};

        if (context.mode === "query") {
          if (!context.query.trim()) {
            setProducts([]);
            return;
          }
          params.search = context.query.trim();
        } else if (context.mode === "category") {
          params.category = context.categoryId;
          // We assume backend returns products from this category and its subcategories.
          // If your API needs an explicit flag, add: params.includeSubcategories = "true";
        }

        const queryString = Object.keys(params)
          .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
          .join("&");

        if (queryString) {
          url += `?${queryString}`;
        }

        const res = await axiosInstance.get(url);
        const list = res.data?.data ?? res.data ?? [];
        setProducts(Array.isArray(list) ? list : []);
      } catch (err) {
        console.log("[SearchResults] fetch error:", err);
        setError("Could not load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [JSON.stringify(context)]);

  const title = useMemo(() => {
    if (context.mode === "category") {
      return context.categoryName || "Category Results";
    }
    if (!context.query.trim()) return "Search Results";
    return `Results for “${context.query.trim()}”`;
  }, [context]);

  if (loading) {
    return <Loader variant="inline" message="Searching products..." />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!products.length) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="search-outline" size={42} color={colors.disabled} />
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptySubtitle}>
          Try refining your search term or choosing a different category.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerCount}>{products.length} items</Text>
      </View>
      <ProductGrid products={products} responsive />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  headerCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});

