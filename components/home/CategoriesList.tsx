// components/home/CategoriesList.tsx
import { ScrollView, StyleSheet, View, ActivityIndicator } from "react-native";
import CategoryItem from "./CategoryItem";
import { SCREEN_PADDING } from "@/constants/layout";
import type { DisplayCategory } from "@/constants/catalog/categoriesCatalog";
import { colors } from "@/constants/colors";
import { resolveCategoryImage } from "@/assets/category-images/categoryImageMap";

type Props = {
  categories: DisplayCategory[];
  onSelectCategory: (category: DisplayCategory) => void;
  loading?: boolean;
};

export default function CategoriesList({ categories, onSelectCategory, loading }: Props) {
  if (loading && categories.length === 0) {
    return (
      <View style={s.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
      >
        {categories.map((item) => {
          return (
            <CategoryItem
              key={item.slug || item._id}
              title={item.name}
              image={resolveCategoryImage(item.slug, item.name)}
              onPress={() => onSelectCategory(item)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    gap: 10,
  },
  loadingRow: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 20,
    alignItems: "center",
  },
});