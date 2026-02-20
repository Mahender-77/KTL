// components/product/ProductGrid.tsx
import { FlatList, View, Text, StyleSheet } from "react-native";
import ProductCard from "./ProductCard";
import { Product } from "@/assets/types/product";
import { SCREEN_PADDING, CARD_GAP } from "@/constants/layout";
import { colors } from "@/constants/colors";


type Props = {
  products?: Product[];
};

export default function ProductGrid({ products = [] }: Props) {
  if (!products.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item._id}
      numColumns={2}
      scrollEnabled={false}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <ProductCard
          id={item._id}
          name={item.name}
          images={item.images}
          variants={item.variants}
          description={item.description}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },
  emptyContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});