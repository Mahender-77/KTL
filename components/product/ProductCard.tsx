// components/product/ProductCard.tsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Variant } from "@/assets/types/product";
import { CARD_WIDTH } from "@/constants/layout";
import { colors } from "@/constants/colors";

import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/context/CartContext";
import Toast from "@/components/common/Toast";


function variantLabel(v: Variant): string {
  return `${v.value}${v.unit}`;
}

function discountPercent(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

type Props = {
  id: string;
  name: string;
  images: string[];
  variants: Variant[];
  description?: string;
  badge?: string;
  rating?: number;
};

export default function ProductCard({
  id,
  name,
  images,
  variants,
  description,
  badge,
  rating,
}: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [addedIdx, setAddedIdx] = useState<number | null>(null); // tracks which variant was just added
  const [adding, setAdding] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const selected = variants[selectedIdx];
  const discount = selected ? discountPercent(selected) : null;
  const displayPrice = selected?.offerPrice ?? selected?.price ?? 0;
  const originalPrice = selected?.offerPrice ? selected.price : undefined;

  const handleAddToCart = async (e: any) => {
    e.stopPropagation?.();
    if (!selected?._id) return;

    try {
      setAdding(true);
      await addToCart(id, selected._id);
      setAddedIdx(selectedIdx);
      setShowToast(true);
      // Reset "Added" state after 2s
      setTimeout(() => setAddedIdx(null), 2000);
    } catch (err) {
      console.log("Add to cart failed:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleViewCart = () => {
    router.push("/(tabs)/cart");
  };

  const isAdded = addedIdx === selectedIdx;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.93}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id } })}
    >
      {/* ── Image ── */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: images?.[0] ?? "" }}
          style={styles.image}
          resizeMode="cover"
        />
        {discount != null && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.wishlistBtn}
          activeOpacity={0.75}
          onPress={(e) => e.stopPropagation?.()}
        >
          <Text style={styles.wishlistIcon}>♡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Variants + Price */}
        <View style={styles.variantPriceRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillContainer}
          >
            {variants.map((v, i) => (
              <TouchableOpacity
                key={v._id ?? String(i)}
                style={[styles.pill, i === selectedIdx && styles.pillActive]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setSelectedIdx(i);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    i === selectedIdx && styles.pillTextActive,
                  ]}
                >
                  {variantLabel(v)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.priceBlock}>
            {originalPrice != null && (
              <Text style={styles.originalPrice}>
                ₹{originalPrice.toLocaleString()}
              </Text>
            )}
            <Text style={styles.price}>₹{displayPrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* Add to Cart button */}
        <TouchableOpacity
          style={[styles.addBtn, isAdded && styles.addBtnSuccess]}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : isAdded ? (
            <>
              <Ionicons name="checkmark" size={14} color={colors.card} />
              <Text style={styles.addBtnText}>Added!</Text>
            </>
          ) : (
            <Text style={styles.addBtnText}>+ Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={`${name} added to cart!`}
        actionLabel="View Cart"
        onAction={handleViewCart}
        onDismiss={() => setShowToast(false)}
        duration={5000}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 3 / 2,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  discountTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  discountText: { color: colors.card, fontSize: 8, fontWeight: "800" },
  badge: {
    position: "absolute",
    top: 6,
    right: 32,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: { color: colors.card, fontSize: 8, fontWeight: "700" },
  wishlistBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  wishlistIcon: { fontSize: 12, color: colors.primary, lineHeight: 14 },
  body: { padding: 8 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 3,
  },
  description: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
    marginBottom: 5,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  star: { fontSize: 10, color: colors.warning, marginRight: 2 },
  ratingText: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
  variantPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pillScroll: { flex: 1 },
  pillContainer: { gap: 4, alignItems: "center" },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 9, fontWeight: "600", color: colors.textMuted },
  pillTextActive: { color: colors.card },
  priceBlock: { alignItems: "flex-end", marginLeft: 6, flexShrink: 0 },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 9,
    color: colors.disabled,
    textDecorationLine: "line-through",
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  addBtnSuccess: {
    backgroundColor: colors.success,
  },
  addBtnText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
