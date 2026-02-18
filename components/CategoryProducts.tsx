// components/CategoryProducts.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "@/constants/api/axiosInstance";
import ProductGrid from "@/components/product/ProductGrid";
import { SCREEN_PADDING } from "@/constants/layout";

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
  onBack: () => void; // goes all the way back to home
};

export default function CategoryProducts({ selectedCategory, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!selectedCategory) return;
    fetchProducts(selectedCategory._id);
    fetchSubCategories(selectedCategory._id);
    setSelectedSubCategory(null); // reset sub when parent changes
  }, [selectedCategory]);

  const fetchProducts = async (categoryId: string) => {
    try {
      const res = await axiosInstance.get(`/api/products/public?category=${categoryId}`);
      setProducts(res.data);
    } catch (error) {
      console.log("Product fetch error:", error);
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

  // Tapping the parent name in the breadcrumb resets sub selection
  const handleBackToParent = () => {
    setSelectedSubCategory(null);
    if (selectedCategory) fetchProducts(selectedCategory._id);
  };

  return (
    <View style={styles.container}>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <View style={styles.breadcrumb}>

        {/* Home segment */}
        <TouchableOpacity style={styles.crumbBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="home-outline" size={20} color="#FF6B00" />
        </TouchableOpacity>

        {/* Separator */}
        <Ionicons name="chevron-forward" size={16} color="#BBBBBB" style={styles.chevron} />

        {/* Parent category */}
        <TouchableOpacity
          style={styles.crumbBtn}
          onPress={selectedSubCategory ? handleBackToParent : undefined}
          activeOpacity={selectedSubCategory ? 0.7 : 1}
        >
          <Text
            style={[
              styles.crumbText,
              // Active (tappable) when a sub is selected — shows as orange link
              selectedSubCategory ? styles.crumbLink : styles.crumbActive,
            ]}
          >
            {selectedCategory?.name}
          </Text>
        </TouchableOpacity>

        {/* Sub-category segment — only shown when one is selected */}
        {selectedSubCategory && (
          <>
            <Ionicons name="chevron-forward" size={13} color="#BBBBBB" style={styles.chevron} />
            <Text style={styles.crumbActive}>{selectedSubCategory.name}</Text>
          </>
        )}
      </View>

      {/* ── Sub-category chips ─────────────────────────────────────────────── */}
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
              style={[
                styles.chip,
                selectedSubCategory?._id === sub._id && styles.chipActive,
              ]}
              onPress={() => handleSubCategorySelect(sub)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedSubCategory?._id === sub._id && styles.chipTextActive,
                ]}
              >
                {sub.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Products ───────────────────────────────────────────────────────── */}
      <ProductGrid products={products} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },

  // Breadcrumb row
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    marginBottom: 2,
  },
  crumbBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: {
    marginHorizontal: 4,
  },
  crumbText: {
    fontSize: 20,
    fontWeight: "500",
  },
  // Current/final segment — bold, dark, not tappable
  crumbActive: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  // Parent segment when sub is active — orange, signals it's tappable
  crumbLink: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF6B00",
    textDecorationLine: "underline",
  },

  // Sub-category chips
  chipScroll: {
    paddingHorizontal: SCREEN_PADDING,
    marginVertical: 12,
  },
  chipRow: {
    gap: 8,
    paddingRight: SCREEN_PADDING,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  chipActive: {
    backgroundColor: "#1A1A2E",
    borderColor: "#1A1A2E",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});