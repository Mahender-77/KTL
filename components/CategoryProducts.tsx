// components/CategoryProducts.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "@/constants/api/axiosInstance";
import { fetchAllPublicProducts } from "@/constants/api/fetchPublicCatalog";
import {
  fetchMergedSubcategories,
  productMatchesDisplayCategory,
  sameDisplayCategory,
  type CategoryRow,
  type DisplayCategory,
} from "@/constants/catalog/categoriesCatalog";
import ProductGrid from "@/components/product/ProductGrid";
import SearchBar, { SearchSuggestion } from "@/components/common/SearchBar";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";
import Loader from "@/components/common/Loader";
import { Product } from "@/assets/types/product";
import { router } from "expo-router";

type Props = {
  selectedCategory: DisplayCategory | null;
  flatCategories: CategoryRow[];
  onBack: () => void;
};

export default function CategoryProducts({ selectedCategory, flatCategories, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<DisplayCategory[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<DisplayCategory | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAllPublicProducts(axiosInstance);
        setAllProducts(list);
      } catch {
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setSelectedSubCategory(null);
    let cancelled = false;
    (async () => {
      setSubLoading(true);
      try {
        const subs = await fetchMergedSubcategories(axiosInstance, selectedCategory);
        if (!cancelled) setSubCategories(subs);
      } catch {
        if (!cancelled) setSubCategories([]);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) {
      setProducts([]);
      return;
    }
    const target = selectedSubCategory ?? selectedCategory;
    if (!allProducts.length) {
      setProducts([]);
      return;
    }
    setProducts(allProducts.filter((p) => productMatchesDisplayCategory(p, target)));
  }, [selectedCategory, selectedSubCategory, allProducts]);

  const handleSubCategorySelect = (sub: DisplayCategory) => {
    setSelectedSubCategory(sub);
  };

  const handleBackToParent = () => {
    setSelectedSubCategory(null);
  };

  const searchSuggestions: SearchSuggestion[] = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    allProducts.forEach((product) => {
      if (product.name.toLowerCase().includes(query)) {
        suggestions.push({
          id: `product-${product._id}`,
          name: product.name,
          type: "product",
          categoryName:
            typeof product.category === "object" && product.category?.name
              ? product.category.name
              : selectedCategory?.name,
        });
      }
    });

    return suggestions.slice(0, 8);
  }, [searchQuery, allProducts, selectedCategory]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === "product") {
      const productId = suggestion.id.replace("product-", "");
      setSearchQuery("");
      router.push({ pathname: "/product/[id]", params: { id: productId } });
    }
  }, []);

  const catalogLoading = allProducts.length === 0;
  const visibleProducts = products;

  return (
    <View style={styles.container}>
      <SearchBar
        onSearchChange={handleSearchChange}
        suggestions={searchSuggestions}
        onSuggestionSelect={handleSuggestionSelect}
        showSuggestions={true}
      />

      <View style={styles.breadcrumb}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.crumbBtn}
        >
          <Ionicons name="home-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={16} color={colors.disabled} style={styles.chevron} />

        <TouchableOpacity
          onPress={selectedSubCategory ? handleBackToParent : undefined}
          activeOpacity={selectedSubCategory ? 0.7 : 1}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={styles.crumbBtn}
        >
          <Text style={[styles.crumbText, selectedSubCategory ? styles.crumbLink : styles.crumbActive]}>
            {selectedCategory?.name}
          </Text>
        </TouchableOpacity>

        {selectedSubCategory && (
          <>
            <Ionicons name="chevron-forward" size={13} color={colors.disabled} style={styles.chevron} />
            <Text style={styles.crumbActive}>{selectedSubCategory.name}</Text>
          </>
        )}
      </View>

      {subLoading ? (
        <View style={styles.subLoading}>
          <Loader variant="inline" message="Loading subcategories..." />
        </View>
      ) : (
        subCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {subCategories.map((sub) => {
              const selected = sameDisplayCategory(selectedSubCategory, sub);
              return (
                <TouchableOpacity
                  key={sub.slug || sub._id}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => handleSubCategorySelect(sub)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{sub.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      )}

      {catalogLoading ? (
        <Loader variant="inline" message="Loading products..." />
      ) : visibleProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="basket-outline" size={48} color={colors.disabled} />
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ProductGrid products={visibleProducts} categories={flatCategories} responsive />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subLoading: {
    paddingVertical: 8,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.card,
  },
  crumbBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: { marginHorizontal: 6 },
  crumbText: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  crumbActive: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  crumbLink: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.primary,
    textDecorationLine: "underline",
  },
  chipScroll: {
    paddingHorizontal: SCREEN_PADDING,
    marginVertical: 12,
    flexGrow: 0,
  },
  chipRow: {
    gap: 8,
    paddingRight: SCREEN_PADDING,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  chipTextActive: { color: colors.card, fontWeight: "700" },
  emptyState: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
