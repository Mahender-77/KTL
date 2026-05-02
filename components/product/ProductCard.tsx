// components/product/ProductCard.tsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Variant } from "@/assets/types/product";
import { CARD_WIDTH, CARD_HEIGHT } from "@/constants/layout";
import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useFeedback } from "@/context/FeedbackContext";
import { resolvePublicMediaUri } from "@/utils/imageUri";

const EXPIRING_SOON_DAYS = 7;

// ─── helpers ─────────────────────────────────────────────────────────────────

function variantLabel(v: Variant): string {
  return `${v.value} ${v.unit}`;
}

function discountPercent(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

function isExpiringSoon(d: string | Date | null | undefined): boolean {
  if (!d) return false;
  const days = (new Date(d).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days < EXPIRING_SOON_DAYS;
}

function formatPrice(n: number): string {
  return Math.floor(n).toLocaleString("en-IN");
}

// ─── types ───────────────────────────────────────────────────────────────────

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
  categoryLabel?: string;
  rating?: number;
  tags?: string[];
  taxRate?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  cardWidth?: number;
  cardHeight?: number;
  onProductPress?: (productId: string) => void;
};

// ─── component ───────────────────────────────────────────────────────────────

export default function ProductCard({
  id,
  name,
  images,
  pricingMode,
  baseUnit,
  pricePerUnit,
  availableQuantity,
  hasExpiry,
  nearestExpiry,
  variants = [],
  categoryLabel,
  rating,
  cardWidth: propCardWidth,
  cardHeight: propCardHeight,
  onProductPress,
}: Props) {
  const router = useRouter();
  const { isInWishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } =
    useWishlist();
  const { isAuthenticated } = useAuth();
  const { showToast } = useFeedback();

  const cardWidth  = propCardWidth  ?? CARD_WIDTH;
  const cardHeight = propCardHeight ?? CARD_HEIGHT;
  const imageHeight = Math.round(cardWidth * 0.78);
  const coverUri = resolvePublicMediaUri(images?.[0]);

  const isFixed  = pricingMode === "fixed";
  const v        = isFixed ? variants[0] : null;
  const discount = v ? discountPercent(v) : null;
  const hasOffer = v && v.offerPrice != null && v.offerPrice > 0 && v.offerPrice < v.price;

  const sellingPrice  = v ? (hasOffer ? v.offerPrice! : v.price) : pricePerUnit;
  const originalPrice = hasOffer ? v!.price : null;
  const outOfStock    = availableQuantity <= 0 && !isFixed;

  const showExpiringSoon = hasExpiry && isExpiringSoon(nearestExpiry);
  const isWishlisted = isInWishlist(id);

  const priceSuffix =
    pricingMode === "custom-weight"
      ? `/ ${baseUnit}`
      : isFixed && v
      ? `/ ${variantLabel(v)}`
      : "";

  // guards
  if (!id) return null;
  if (isFixed && variants.length === 0) return null;

  const handleToggleWishlist = async (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (!isAuthenticated) {
      showToast({
        variant: "info",
        title: "Login required",
        message: "Please sign in to save items to your wishlist.",
        secondaryLabel: "Cancel",
        actionLabel: "Sign in",
        onAction: () => router.push("/(auth)/login" as any),
      });
      return;
    }
    try {
      isWishlisted ? await removeFromWishlist(id) : await addToWishlist(id);
    } catch {
      /* surfaced elsewhere */
    }
  };

  return (
    <TouchableOpacity
      style={[s.card, { width: cardWidth, minHeight: cardHeight }]}
      activeOpacity={0.92}
      onPress={() => {
        onProductPress?.(id);
        router.push({ pathname: "/product/[id]", params: { id } });
      }}
    >
      {/* ── Image ── */}
      <View style={[s.imageWrap, { height: imageHeight }]}>
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={s.image}
            resizeMode="contain"
            accessibilityLabel={name}
          />
        ) : (
          <View style={s.imageFallback}>
            <Ionicons name="image-outline" size={30} color={colors.textMuted} />
          </View>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <View style={s.outOfStockOverlay}>
            <Text style={s.outOfStockText}>Out of Stock</Text>
          </View>
        )}

        {/* Discount badge — top-left */}
        {isFixed && discount != null && (
          <View style={s.discountBadge}>
            <Text style={s.discountText}>{discount}% off</Text>
          </View>
        )}

        {/* Expiry badge — bottom-left */}
        {showExpiringSoon && (
          <View style={s.expiryBadge}>
            <Ionicons name="time-outline" size={9} color="#92600A" />
            <Text style={s.expiryText}>Expiring soon</Text>
          </View>
        )}

        {/* Wishlist — top-right */}
        <TouchableOpacity
          style={s.wishlistBtn}
          onPress={handleToggleWishlist}
          disabled={wishlistLoading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            size={14}
            color={isWishlisted ? "#E53935" : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={s.body}>
        {/* Category label */}
        {categoryLabel ? (
          <Text style={s.category} numberOfLines={1}>
            {categoryLabel.toUpperCase()}
          </Text>
        ) : null}

        {/* Rating pill */}
        {rating != null && (
          <View style={[s.ratingPill, rating >= 4 ? s.ratingHigh : s.ratingMid]}>
            <Text style={s.ratingStar}>★</Text>
            <Text style={s.ratingValue}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Product name */}
        <Text style={s.name} numberOfLines={2}>{name}</Text>

        {/* Price section */}
        <View style={s.priceBlock}>
          <View style={s.priceRow}>
            <Text style={s.rupee}>₹</Text>
            <Text style={s.price}>{formatPrice(sellingPrice)}</Text>
            {priceSuffix ? <Text style={s.suffix}>{priceSuffix}</Text> : null}
          </View>

          {originalPrice != null && (
            <View style={s.savingsRow}>
              <Text style={s.mrp}>MRP ₹{formatPrice(originalPrice)}</Text>
              {discount != null && (
                <Text style={s.savingsText}>{discount}% off</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const SHADOW =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      }
    : { elevation: 2 };

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EAEDF2",
    ...SHADOW,
  },

  // Image
  imageWrap: {
    width: "100%",
    backgroundColor: "#F4F6F9",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },

  // Out of stock
  outOfStockOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Badges
  discountBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  discountText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  expiryBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0A500",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  expiryText: {
    color: "#92600A",
    fontSize: 9,
    fontWeight: "700",
  },

  wishlistBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },

  // Body
  body: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 3,
  },

  category: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 1,
  },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  ratingHigh: { backgroundColor: "#2E7D32" },
  ratingMid:  { backgroundColor: "#F57F17" },
  ratingStar: { fontSize: 9, color: "#fff", fontWeight: "700" },
  ratingValue: { fontSize: 9, color: "#fff", fontWeight: "700" },

  name: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
    lineHeight: 18,
    letterSpacing: -0.1,
  },

  // Price
  priceBlock: {
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EAEDF2",
    gap: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  rupee: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 1,
  },
  price: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  suffix: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textMuted,
    marginLeft: 3,
    alignSelf: "center",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  mrp: {
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  savingsText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: "700",
  },
});