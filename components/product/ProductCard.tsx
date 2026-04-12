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

/** Display price as whole number (no decimals). Tax is calculated at checkout. */
function formatPrice(value: number): string {
  return Math.floor(value).toLocaleString();
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
  /** Category name when API populates category as an object */
  categoryLabel?: string;
  rating?: number;
  tags?: string[];
  taxRate?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  /** Override card dimensions for responsive layouts */
  cardWidth?: number;
  cardHeight?: number;
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
  categoryLabel,
  rating,
  taxRate,
  cardWidth: propCardWidth,
  cardHeight: propCardHeight,
}: Props) {
  const router = useRouter();
  const { isInWishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { isAuthenticated } = useAuth();
  const cardWidth = propCardWidth ?? CARD_WIDTH;
  const cardHeight = propCardHeight ?? CARD_HEIGHT;

  const isFixed = pricingMode === "fixed";
  const v = isFixed ? variants[0] : null;
  const discount = v ? discountPercent(v) : null;
  // Show price before tax; if no valid offer price (missing or 0), use original price
  const hasValidOffer = v && v.offerPrice != null && v.offerPrice > 0 && v.offerPrice < v.price;
  const basePrice = v ? (hasValidOffer ? v.offerPrice! : v.price) : pricePerUnit;
  const originalPrice = hasValidOffer ? v.price : null;
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
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth, height: cardHeight }]}
      activeOpacity={0.93}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id } })}
    >
      {/* ── Image ── */}
      <View style={[styles.imageWrapper, { height: cardWidth * 0.82 }]}>
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
        {categoryLabel ? (
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {categoryLabel}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          {originalPrice != null && (
            <Text style={styles.originalPrice}>
              ₹{formatPrice(originalPrice)}
            </Text>
          )}
          <Text style={styles.price}>
            ₹{formatPrice(basePrice)}
            {pricingMode === "custom-weight" && ` / ${baseUnit}`}
            {isFixed && v && ` / ${variantLabel(v)}`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
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
    paddingTop: 4,
    paddingBottom: 6,
    justifyContent: "flex-start",
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
  categoryLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  unitLabel: {
    fontSize: 10,
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
