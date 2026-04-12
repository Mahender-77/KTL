// components/home/CategoriesList.tsx
import { ScrollView, StyleSheet, View, ActivityIndicator } from "react-native";
import CategoryItem from "./CategoryItem";
import { Ionicons } from "@expo/vector-icons";
import { SCREEN_PADDING } from "@/constants/layout";
import type { DisplayCategory } from "@/constants/catalog/categoriesCatalog";
import { colors } from "@/constants/colors";

const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  garlic: "leaf-outline",
  ginger: "nutrition-outline",
  vegetables: "leaf-outline",
  fruits: "nutrition-outline",
  "fresh-fruits": "basket-outline",
  juices: "wine-outline",
  dairy: "cafe-outline",
  spices: "flame-outline",
  grains: "cube-outline",
  meat: "restaurant-outline",
};

type Props = {
  categories: DisplayCategory[];
  onSelectCategory: (category: DisplayCategory) => void;
  loading?: boolean;
};

export default function CategoriesList({ categories, onSelectCategory, loading }: Props) {
  return (
    <View style={styles.wrapper}>
      {loading && categories.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING }}
        >
          {categories.map((item) => (
            <CategoryItem
              key={item.slug || item._id}
              title={item.name}
              icon={
                categoryIconMap[(item.slug || "").toLowerCase()] || "grid-outline"
              }
              onPress={() => onSelectCategory(item)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  loadingRow: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 16,
    alignItems: "center",
  },
});
