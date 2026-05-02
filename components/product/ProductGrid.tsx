// components/product/ProductGrid.tsx
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "./ProductCard";
import { Product } from "@/assets/types/product";
import { SCREEN_PADDING, CARD_GAP, useLayout } from "@/constants/layout";
import { colors } from "@/constants/colors";

function categoryLabelFor(
  item: Product,
  categories?: { _id: string; name: string }[]
): string | undefined {
  if (typeof item.category === "object" && item.category && "name" in item.category) {
    return (item.category as { name: string }).name;
  }
  if (typeof item.category === "string" && categories?.length) {
    return categories.find((c) => c._id === item.category)?.name;
  }
  return undefined;
}

type Props = {
  products?: Product[];
  categories?: { _id: string; name: string }[];
  onRemove?: (productId: string) => void;
  showRemoveButton?: boolean;
  responsive?: boolean;
  onProductPress?: (productId: string) => void;
};

export default function ProductGrid({
  products = [],
  categories,
  onRemove,
  showRemoveButton = false,
  responsive = false,
  onProductPress,
}: Props) {
  const layout = useLayout();
  const cardWidth  = responsive ? layout.cardWidth  : undefined;
  const cardHeight = responsive ? layout.cardHeight : undefined;

  if (!products.length) {
    return (
      <View style={s.emptyWrap}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="basket-outline" size={36} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>No products available</Text>
        <Text style={s.emptySub}>Check back later for new items</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item, index) =>
        item._id ?? (item as any).id ?? `product-${index}`
      }
      numColumns={2}
      scrollEnabled={false}
      contentContainerStyle={s.container}
      columnWrapperStyle={s.row}
      renderItem={({ item, index }) => {
        const categoryLabel = categoryLabelFor(item, categories);
        return (
          <View style={showRemoveButton ? s.cardWrapper : undefined}>
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
              categoryLabel={categoryLabel}
              tags={item.tags}
              taxRate={item.taxRate}
              minOrderQty={item.minOrderQty}
              maxOrderQty={item.maxOrderQty}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onProductPress={onProductPress}
            />
            {showRemoveButton && onRemove && (
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => onRemove(item._id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },

  // Card wrapper (wishlist remove overlay)
  cardWrapper: {
    position: "relative",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  // Empty state
  emptyWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
  },
});