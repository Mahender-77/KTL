import { ScrollView, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import CategoryItem from "./CategoryItem";
import axiosInstance from "@/constants/api/axiosInstance";
import { Ionicons } from "@expo/vector-icons";

type Category = {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
};

type Props = {
  onSelectCategory: (category: Category) => void;
};

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


export default function CategoriesList({ onSelectCategory }: Props) 
{
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosInstance.get("/api/categories");

        // show only parent categories
        const parentCategories = res.data.filter(
          (cat: Category) => !cat.parent
        );

        setCategories(parentCategories);
      } catch (error) {
        console.log("Category fetch error:", error);
      }
    };

    fetchCategories();
  }, []);



  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
    {categories.map((item) => (
  <CategoryItem
    key={item._id}
    title={item.name}
    icon={
      categoryIconMap[item.slug.toLowerCase()] || "grid-outline"
    }
    onPress={() => onSelectCategory(item)}   // 👈 ADD THIS
  />
))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
});
