// components/product/ProductCard.tsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Variant } from "@/assets/types/product";
import { CARD_WIDTH } from "@/constants/layout";

function variantLabel(v: Variant): string {
  return `${v.value}${v.unit}`;
}

function discountPercent(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

type Props = {
  id: string;           // ← product _id for navigation
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
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = variants[selectedIdx];

  const discount = selected ? discountPercent(selected) : null;
  const displayPrice = selected?.offerPrice ?? selected?.price ?? 0;
  const originalPrice = selected?.offerPrice ? selected.price : undefined;

  const handleCardPress = () => {
    // Navigate to detail page — Expo Router dynamic route
    router.push({ pathname: "/product/[id]", params: { id } });
  };

  return (
    // ✅ Outer TouchableOpacity opens detail page
    <TouchableOpacity style={styles.card} activeOpacity={0.93} onPress={handleCardPress}>
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
        <TouchableOpacity style={styles.wishlistBtn} activeOpacity={0.75}
          // Stop propagation so wishlist tap doesn't open the detail page
          onPress={(e) => { e.stopPropagation?.(); }}
        >
          <Text style={styles.wishlistIcon}>♡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>

        {description ? (
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        ) : null}

        {rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Variants + Price on same line */}
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
                // Stop propagation so pill tap doesn't open detail page
                onPress={(e) => { e.stopPropagation?.(); setSelectedIdx(i); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, i === selectedIdx && styles.pillTextActive]}>
                  {variantLabel(v)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.priceBlock}>
            {originalPrice != null && (
              <Text style={styles.originalPrice}>₹{originalPrice.toLocaleString()}</Text>
            )}
            <Text style={styles.price}>₹{displayPrice.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          // Stop propagation so Add tap doesn't open detail page
          onPress={(e) => { e.stopPropagation?.(); }}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 3 / 2,
    backgroundColor: "#F4F1EC",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  discountTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  discountText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  badge: {
    position: "absolute",
    top: 6,
    right: 32,
    backgroundColor: "#1A1A2E",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },
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
  wishlistIcon: { fontSize: 12, color: "#FF6B35", lineHeight: 14 },
  body: { padding: 8 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    lineHeight: 20,
    marginBottom: 3,
  },
  description: {
    fontSize: 11,
    color: "#999",
    lineHeight: 15,
    marginBottom: 5,
    fontWeight: "400",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  star: { fontSize: 10, color: "#F5A623", marginRight: 2 },
  ratingText: { fontSize: 10, color: "#888", fontWeight: "600" },
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
    borderColor: "#E4E1DC",
    backgroundColor: "#F9F7F4",
  },
  pillActive: { backgroundColor: "#1A1A2E", borderColor: "#1A1A2E" },
  pillText: { fontSize: 9, fontWeight: "600", color: "#777" },
  pillTextActive: { color: "#fff" },
  priceBlock: { alignItems: "flex-end", marginLeft: 6, flexShrink: 0 },
  price: { fontSize: 16, fontWeight: "800", color: "#FF6B35", letterSpacing: -0.3 },
  originalPrice: { fontSize: 9, color: "#BDBAB5", textDecorationLine: "line-through" },
  addBtn: {
    backgroundColor: "#1A1A2E",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
});