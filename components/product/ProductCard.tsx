// components/product/ProductCard.tsx
// Flipkart/Amazon-style card: uniform size, no Add to Cart (add from detail screen)
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Variant } from "@/assets/types/product";
import { CARD_WIDTH, CARD_HEIGHT } from "@/constants/layout";
import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";

const EXPIRING_SOON_DAYS = 7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function variantLabel(v: Variant): string {
  return `${v.value} ${v.unit}`;
}

function discountPercent(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

function isExpiringSoon(nearestExpiry: string | Date | null | undefined): boolean {
  if (!nearestExpiry) return false;
  const exp = new Date(nearestExpiry);
  const daysLeft = (exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  return daysLeft >= 0 && daysLeft < EXPIRING_SOON_DAYS;
}

function withTax(price: number, taxRate?: number | null): number {
  if (!taxRate || taxRate <= 0) return price;
  return price * (1 + taxRate / 100);
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  id: string;
  name: string;
  images: string[];
  pricingMode: "fixed" | "custom-weight" | "unit";
  baseUnit: string;
  pricePerUnit: number;
  availableQuantity: number;
  hasExpiry: boolean;
  nearestExpiry?: string | Date | null;
  variants?: Variant[];
  description?: string;
  badge?: string;
  rating?: number;
  tags?: string[];
  taxRate?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductCard({
  id,
  name,
  images,
  pricingMode,
  baseUnit,
  pricePerUnit,
  hasExpiry,
  nearestExpiry,
  variants = [],
  rating,
  taxRate,
}: Props) {
  const router = useRouter();
  const { isInWishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { isAuthenticated } = useAuth();

  const isFixed = pricingMode === "fixed";
  const v = isFixed ? variants[0] : null;
  const discount = v ? discountPercent(v) : null;
  const basePrice = v ? (v.offerPrice ?? v.price) : pricePerUnit;
  const displayPrice = withTax(basePrice, taxRate);
  const originalPrice = v?.offerPrice ? withTax(v.price, taxRate) : null;
  const showExpiringSoon = hasExpiry && isExpiringSoon(nearestExpiry);
  const isWishlisted = isInWishlist(id);

  if (!id) return null;
  if (isFixed && variants.length === 0) return null;

  const handleToggleWishlist = async (e: any) => {
    e.stopPropagation?.();
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to your wishlist");
      return;
    }
    try {
      if (isWishlisted) await removeFromWishlist(id);
      else await addToWishlist(id);
    } catch (err) {
      console.log("Wishlist toggle error:", err);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.93}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id } })}
    >
      {/* ── Image ── */}
      <View style={styles.imageWrapper}>
        {images && images.length > 0 && images[0] ? (
          <Image source={{ uri: images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}

        {isFixed && discount != null && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {showExpiringSoon && (
          <View style={styles.expiringBadge}>
            <Text style={styles.badgeText}>Expiring Soon</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.wishlistBtn}
          activeOpacity={0.75}
          onPress={handleToggleWishlist}
          disabled={wishlistLoading}
        >
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={14}
            color={isWishlisted ? colors.error : "#666"}
          />
        </TouchableOpacity>
      </View>

      {/* ── Body (Flipkart-style) ── */}
      <View style={styles.body}>
        {rating != null && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        <Text style={styles.name} numberOfLines={2}>{name}</Text>

        {/* Weight/size — e.g. "1 kg" for fruits, "500g" for fixed variants */}
        {isFixed && v && (
          <Text style={styles.unitLabel}>{variantLabel(v)}</Text>
        )}

        <View style={styles.priceRow}>
          {originalPrice != null && (
            <Text style={styles.originalPrice}>
              ₹{originalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={styles.price}>
            ₹{displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {(pricingMode === "custom-weight" || pricingMode === "unit") && ` / ${baseUnit}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrapper: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: colors.card,
    fontSize: 9,
    fontWeight: "800",
  },
  expiringBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: "700",
  },
  wishlistBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: "space-between",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  ratingStar: {
    fontSize: 10,
    color: colors.success,
    marginRight: 2,
    fontWeight: "700",
  },
  ratingText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  unitLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  originalPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
});
