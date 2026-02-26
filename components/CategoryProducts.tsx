// components/CategoryProducts.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "@/constants/api/axiosInstance";
import ProductGrid from "@/components/product/ProductGrid";
import SearchBar from "@/components/common/SearchBar";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";


type Category = {
  _id: string;
  name: string;
  parent: string | null;
};

type Product = {
  _id: string;
  name: string;
  images: string[];
  description: string;
  variants: any[];
};

type Props = {
  selectedCategory: Category | null;
  onBack: () => void;
};

export default function CategoryProducts({ selectedCategory, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCategory) return;
    setSelectedSubCategory(null);
    fetchSubCategories(selectedCategory._id);
    fetchProducts(selectedCategory._id);
  }, [selectedCategory]);

  const fetchProducts = async (categoryId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/products/public?category=${categoryId}`);
      setProducts(res.data?.data ?? []);
    } catch (error) {
      console.log("Product fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (parentId: string) => {
    try {
      const res = await axiosInstance.get(`/api/categories/${parentId}/subcategories`);
      setSubCategories(res.data);
    } catch (error) {
      console.log("Sub category error:", error);
    }
  };

  const handleSubCategorySelect = (sub: Category) => {
    setSelectedSubCategory(sub);
    fetchProducts(sub._id);
  };

  const handleBackToParent = () => {
    setSelectedSubCategory(null);
    if (selectedCategory) fetchProducts(selectedCategory._id);
  };

  return (
    <View style={styles.container}>

      {/* ── Search Bar (same as home) ── */}
      <SearchBar />

      {/* ── Breadcrumb ── */}
      <View style={styles.breadcrumb}>
        {/* Home icon */}
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.crumbBtn}
        >
          <Ionicons name="home-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={16} color={colors.disabled} style={styles.chevron} />

        {/* Parent category */}
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

        {/* Sub-category segment */}
        {selectedSubCategory && (
          <>
            <Ionicons name="chevron-forward" size={13} color={colors.disabled} style={styles.chevron} />
            <Text style={styles.crumbActive}>{selectedSubCategory.name}</Text>
          </>
        )}
      </View>

      {/* ── Sub-category chips ── */}
      {subCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {subCategories.map((sub) => (
            <TouchableOpacity
              key={sub._id}
              style={[styles.chip, selectedSubCategory?._id === sub._id && styles.chipActive]}
              onPress={() => handleSubCategorySelect(sub)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.chipText, selectedSubCategory?._id === sub._id && styles.chipTextActive]}>
                {sub.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Products ── */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
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
          <ProductGrid products={products} />
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
    flexGrow: 0,         // prevent chipScroll from expanding and eating layout space
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