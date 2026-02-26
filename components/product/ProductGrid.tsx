// components/product/ProductGrid.tsx
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { Product } from "@/assets/types/product";
import { SCREEN_PADDING, CARD_GAP } from "@/constants/layout";
import { colors } from "@/constants/colors";

type Props = {
  products?: Product[];
  onRemove?: (productId: string) => void;
  showRemoveButton?: boolean;
};

export default function ProductGrid({ products = [], onRemove, showRemoveButton = false }: Props) {
  if (!products.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basket-outline" size={40} color={colors.disabled} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyText}>No products available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item, index) => item._id ?? (item as any).id ?? `product-${index}`}
      numColumns={2}
      scrollEnabled={false}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      renderItem={({ item, index }) => (
        <View style={showRemoveButton ? styles.cardWrapper : undefined}>
          <ProductCard
            id={item._id ?? (item as any).id ?? `product-${index}`}
            name={item.name}
            images={item.images ?? []}
            pricingMode={item.pricingMode ?? "unit"}
            baseUnit={item.baseUnit ?? "pcs"}
            pricePerUnit={item.pricePerUnit ?? 0}
            availableQuantity={item.availableQuantity ?? 0}
            hasExpiry={item.hasExpiry ?? false}
            nearestExpiry={item.nearestExpiry}
            variants={item.variants ?? []}
            description={item.description}
            // ── new fields ──
            tags={item.tags}
            taxRate={item.taxRate}
            minOrderQty={item.minOrderQty}
            maxOrderQty={item.maxOrderQty}
          />
          {showRemoveButton && onRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(item._id)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={18} color={colors.card} />
            </TouchableOpacity>
          )}
        </View>
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
  cardWrapper: {
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    bottom: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.error,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
    elevation: 5, zIndex: 10,
    borderWidth: 2, borderColor: colors.card,
  },
  emptyContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});