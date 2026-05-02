// components/product/ProductDetailScreen.tsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Variant, Product } from "@/assets/types/product";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import Toast from "@/components/common/Toast";
import { parseImageUri } from "@/utils/imageUri";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiscount(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

function vLabel(v: Variant) { return `${v.value} ${v.unit}`; }

function getAvailableStockForVariant(
  stockByStoreVariant: Product["stockByStoreVariant"],
  variantId: string | undefined
): number {
  if (!variantId || !stockByStoreVariant?.length) return 0;
  return stockByStoreVariant
    .filter((s) => String(s.variant) === String(variantId))
    .reduce((sum, s) => sum + (s.availableStock ?? 0), 0);
}

function withTax(price: number, taxRate?: number | null): number {
  if (!taxRate || taxRate <= 0) return price;
  return price * (1 + taxRate / 100);
}

function formatPrice(value: number): string {
  return Math.floor(value).toLocaleString();
}

// ─── Dummy similar products ───────────────────────────────────────────────────

const DUMMY_SIMILAR = [
  { _id: "d1", name: "Fresh Tomatoes", price: 49, offerPrice: 39 },
  { _id: "d2", name: "Green Capsicum", price: 60, offerPrice: null },
  { _id: "d3", name: "Baby Spinach",   price: 35, offerPrice: 29 },
  { _id: "d4", name: "Red Onion",      price: 55, offerPrice: 45 },
];

// ─── Similar Card ─────────────────────────────────────────────────────────────

function DummySimilarCard({ item, cardWidth }: { item: typeof DUMMY_SIMILAR[0]; cardWidth: number }) {
  const pct = item.offerPrice
    ? Math.round(((item.price - item.offerPrice) / item.price) * 100)
    : null;
  return (
    <View style={[sc.card, { width: cardWidth }]}>
      <View style={sc.imgBox}>
        <View style={sc.imgPlaceholder}>
          <Ionicons name="leaf-outline" size={32} color={colors.primaryLight} />
        </View>
        {pct ? (
          <View style={sc.badge}><Text style={sc.badgeT}>{pct}% OFF</Text></View>
        ) : null}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        <Text style={sc.size}>500 g</Text>
        <View style={sc.priceRow}>
          {item.offerPrice ? <Text style={sc.orig}>₹{formatPrice(item.price)}</Text> : null}
          <Text style={sc.price}>₹{formatPrice(item.offerPrice ?? item.price)}</Text>
        </View>
      </View>
    </View>
  );
}

function SimilarCard({ item, cardWidth }: { item: Product; cardWidth: number }) {
  const router = useRouter();
  const v = item.variants?.[0];
  const isFixed = item.pricingMode === "fixed";
  const hasValidOffer = isFixed && v && v.offerPrice != null && v.offerPrice > 0 && v.offerPrice < v.price;
  const basePrice = isFixed && v ? (hasValidOffer ? v.offerPrice! : v.price) : (item.pricePerUnit ?? 0);
  const displayPrice = withTax(basePrice, item.taxRate);
  const orig = hasValidOffer && v ? withTax(v.price, item.taxRate) : null;
  const pct = v ? getDiscount(v) : null;
  const similarCoverUri = parseImageUri(item.images?.[0]);

  return (
    <TouchableOpacity
      style={[sc.card, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: item._id } })}
    >
      <View style={sc.imgBox}>
        {similarCoverUri ? (
          <Image source={{ uri: similarCoverUri }} style={sc.img} resizeMode="cover" />
        ) : (
          <View style={[sc.img, sc.imgPlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        {pct ? <View style={sc.badge}><Text style={sc.badgeT}>{pct}% OFF</Text></View> : null}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        {v
          ? <Text style={sc.size}>{vLabel(v)}</Text>
          : <Text style={sc.size}>Per {item.baseUnit ?? "pcs"}</Text>
        }
        <View style={sc.priceRow}>
          {orig != null ? <Text style={sc.orig}>₹{formatPrice(orig)}</Text> : null}
          <Text style={sc.price}>₹{formatPrice(displayPrice)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EAEDF2",
  },
  imgBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F4F6F9",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeT: { color: "#fff", fontSize: 9, fontWeight: "800" },
  info: { padding: 10 },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 16,
    marginBottom: 4,
  },
  size: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary,
    backgroundColor: "#EEF2FF",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
    overflow: "hidden",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: { fontSize: 13, fontWeight: "800", color: colors.primary },
  orig: {
    fontSize: 10,
    color: colors.disabled,
    textDecorationLine: "line-through",
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  product: Product;
  similarProducts?: Product[];
  onBack?: () => void;
  onAddToCart?: (p: Product, v: Variant, qty: number) => void;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen({
  product,
  similarProducts = [],
  onBack,
  onAddToCart,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const similarW = SW * 0.44;

  const { isInWishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { addToCart, loading: cartLoading } = useCart();

  const [varIdx, setVarIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [showAddedToast, setShowAddedToast] = useState(false);

  const pricingMode  = product.pricingMode ?? "unit";
  const baseUnit     = product.baseUnit ?? "pcs";
  const taxRate      = product.taxRate;
  const minOrderQty  = product.minOrderQty;
  const maxOrderQty  = product.maxOrderQty;
  const pricePerUnit = Number(product.pricePerUnit) || 0;
  const availableQty = Number(product.availableQuantity) || 0;

  const isFixed        = pricingMode === "fixed";
  const isCustomWeight = pricingMode === "custom-weight";
  const isUnit         = pricingMode === "unit";

  const v = isFixed && product.variants?.length ? product.variants[varIdx] : null;

  const availableStock = isFixed
    ? getAvailableStockForVariant(product.stockByStoreVariant, v?._id)
    : availableQty;
  const outOfStock = availableStock <= 0;

  const effectiveMin = isCustomWeight
    ? Math.max(0.01, minOrderQty ?? 0.01)
    : (minOrderQty ?? 1);
  const effectiveMax = maxOrderQty
    ? Math.min(maxOrderQty, availableStock)
    : availableStock;

  const [qty, setQty]       = useState(Math.max(1, effectiveMin));
  const [qtyStr, setQtyStr] = useState(String(effectiveMin));

  const displayQty   = isCustomWeight ? (parseFloat(qtyStr) || 0) : (outOfStock ? 0 : qty);
  const exceedsStock = displayQty > effectiveMax;
  const belowMin     = displayQty > 0 && displayQty < effectiveMin;
  const isZeroWeight = isCustomWeight && displayQty <= 0;

  const hasValidOffer = isFixed && v && v.offerPrice != null && v.offerPrice > 0 && v.offerPrice < v.price;
  const basePrice    = isFixed && v ? (hasValidOffer ? v.offerPrice! : v.price) : pricePerUnit;
  const displayPrice = withTax(basePrice, taxRate);
  const origPrice    = hasValidOffer && v ? withTax(v.price, taxRate) : null;
  const pct          = v ? getDiscount(v) : null;
  const total        = displayPrice * displayQty;

  const images = (product.images ?? [])
    .map((u) => parseImageUri(u))
    .filter((u): u is string => u != null);
  const liked = isInWishlist(product._id);

  const prevVarIdx = useRef(varIdx);
  useEffect(() => {
    if (!isFixed) return;
    if (varIdx !== prevVarIdx.current) {
      prevVarIdx.current = varIdx;
      setQty(Math.max(effectiveMin, Math.min(effectiveMin, availableStock > 0 ? 1 : 0)));
    } else if (availableStock > 0 && qty > effectiveMax) {
      setQty(effectiveMax);
    }
  }, [varIdx, availableStock, isFixed, qty, effectiveMin, effectiveMax]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to your wishlist", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    try {
      if (liked) await removeFromWishlist(product._id);
      else await addToWishlist(product._id);
    } catch (err) {}
  };

  const canAddToCart = !outOfStock && !exceedsStock && !belowMin && displayQty > 0;

  const handleAddToCart = async () => {
    if (!canAddToCart || cartLoading) return;
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to your cart", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    const variantId = isFixed && v?._id ? v._id : product._id;
    const qtyToSend = isCustomWeight
      ? Math.round(displayQty * 1000) / 1000
      : Math.floor(displayQty);
    try {
      await addToCart(product._id, variantId, qtyToSend);
      setShowAddedToast(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Please try again.";
      Alert.alert("Could not add to cart", msg);
    }
  };

  const handleBuyNow = async () => {
    if (!canAddToCart || cartLoading) return;
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to your cart", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    const variantId = isFixed && v?._id ? v._id : product._id;
    const qtyToSend = isCustomWeight
      ? Math.round(displayQty * 1000) / 1000
      : Math.floor(displayQty);
    try {
      await addToCart(product._id, variantId, qtyToSend);
      router.push({
        pathname: "/checkout",
        params: { buyNowLine: `${product._id}__${variantId}` },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Please try again.";
      Alert.alert("Could not add to cart", msg);
    }
  };

  const showDummy = similarProducts.length === 0;

  // Trust badges
  const catName = typeof product.category === "object" && product.category?.name
    ? String(product.category.name).toLowerCase() : "";
  const catSlug = typeof product.category === "object" && product.category?.slug
    ? String(product.category.slug).toLowerCase() : "";
  const tags = (product.tags ?? []).map((t) => String(t).toLowerCase());
  const nameDesc = `${(product.name ?? "").toLowerCase()} ${(product.description ?? "").toLowerCase()}`;
  const electronicsKeywords = ["electronic", "watch", "watches", "tech", "gadget", "mobile", "phone", "smart"];
  const matchesKeyword = (s: string) => electronicsKeywords.some((k) => s.includes(k));
  const isElectronics =
    matchesKeyword(catName) || matchesKeyword(catSlug) ||
    tags.some(matchesKeyword) || matchesKeyword(nameDesc);
  const trustItems = isElectronics
    ? [
        { icon: "shield-checkmark-outline", label: "Warranty Assured" },
        { icon: "flash-outline",            label: "Fast Delivery" },
        { icon: "construct-outline",        label: "Quality Checked" },
      ]
    : [
        { icon: "leaf-outline",             label: "100% Fresh" },
        { icon: "flash-outline",            label: "Fast Delivery" },
        { icon: "shield-checkmark-outline", label: "Quality Assured" },
      ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <Toast
        visible={showAddedToast}
        message="Item added to cart"
        actionLabel="View Cart"
        onAction={() => router.push("/(tabs)/cart")}
        onDismiss={() => setShowAddedToast(false)}
        duration={5000}
      />
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Hero image ── */}
        <View style={[s.heroBox, { width: SW, height: SW * 0.88 }]}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) =>
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {images.length > 0 ? (
              images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[s.heroImg, { width: SW, height: SW * 0.88 }]}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View style={[s.heroImg, s.heroImgEmpty, { width: SW, height: SW * 0.88 }]}>
                <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.25)" />
              </View>
            )}
          </ScrollView>

          {/* Gradient overlay */}
          <View style={s.heroGradient} pointerEvents="none" />

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={s.dotRow}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
              ))}
            </View>
          )}

          {/* Top bar */}
          <View style={[s.heroHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={s.heroBtn} onPress={onBack} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.heroBtnGroup}>
              <TouchableOpacity
                style={s.heroBtn}
                onPress={handleToggleWishlist}
                activeOpacity={0.85}
                disabled={wishlistLoading}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={18}
                  color={liked ? "#FF6B6B" : "#fff"}
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtn} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Discount badge */}
          {pct ? (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeText}>{pct}% OFF</Text>
            </View>
          ) : null}

          {/* Out of stock overlay */}
          {outOfStock && (
            <View style={s.outOfStockOverlay}>
              <Text style={s.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* ── Main info card ── */}
        <View style={s.mainCard}>

          {/* Product name & price row */}
          <View style={s.namePriceRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
              {product.description ? (
                <Text style={s.productDesc} numberOfLines={3}>{product.description}</Text>
              ) : null}
            </View>
            {/* Price pill */}
            <View style={s.pricePill}>
              {origPrice != null ? (
                <Text style={s.origPrice}>₹{formatPrice(origPrice)}</Text>
              ) : null}
              <Text style={s.displayPrice}>₹{formatPrice(displayPrice)}</Text>
              <Text style={s.priceUnit}>
                {isFixed && v ? `/ ${vLabel(v)}` : `/ ${baseUnit}`}
              </Text>
            </View>
          </View>

          {/* Trust badges row */}
          <View style={s.trustRow}>
            {trustItems.map((t) => (
              <View key={t.label} style={s.trustChip}>
                <Ionicons name={t.icon as any} size={12} color={colors.primary} />
                <Text style={s.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Variant selector ── */}
        {isFixed && product.variants && product.variants.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons name="resize-outline" size={14} color={colors.primary} />
              </View>
              <Text style={s.cardTitle}>Select Size</Text>
            </View>
            <View style={s.varList}>
              {product.variants.map((vv, i) => {
                const isOn = i === varIdx;
                const vpct = getDiscount(vv);
                const vPrice = withTax(
                  vv.offerPrice != null && vv.offerPrice > 0 ? vv.offerPrice : vv.price,
                  taxRate
                );
                return (
                  <TouchableOpacity
                    key={vv._id ?? i}
                    style={[s.varChip, isOn && s.varChipActive]}
                    onPress={() => { setVarIdx(i); setQty(effectiveMin); }}
                    activeOpacity={0.8}
                  >
                    {vpct && !isOn ? <View style={s.varOfferDot} /> : null}
                    <Text style={[s.varLabel, isOn && s.varLabelActive]}>{vLabel(vv)}</Text>
                    <Text style={[s.varPrice, isOn && s.varPriceActive]}>₹{formatPrice(vPrice)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Quantity ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}>
              <Ionicons name="layers-outline" size={14} color={colors.primary} />
            </View>
            <Text style={s.cardTitle}>
              Quantity{isCustomWeight ? ` (${baseUnit})` : ""}
            </Text>
          </View>

          {isCustomWeight ? (
            <View style={s.weightRow}>
              <View style={s.weightInputWrap}>
                <TextInput
                  style={s.weightInput}
                  value={qtyStr}
                  onChangeText={setQtyStr}
                  keyboardType="decimal-pad"
                  placeholder={String(effectiveMin)}
                  placeholderTextColor={colors.textMuted}
                  onBlur={() => {
                    const n = parseFloat(qtyStr) || effectiveMin;
                    const clamped = Math.max(effectiveMin, Math.min(effectiveMax, n));
                    setQtyStr(String(clamped));
                  }}
                />
                <Text style={s.weightUnit}>{baseUnit}</Text>
              </View>
              <View style={s.weightTotal}>
                <Text style={s.weightTotalLabel}>Total</Text>
                <Text style={s.weightTotalValue}>₹{formatPrice(total)}</Text>
              </View>
            </View>
          ) : (
            <View style={s.stepperRow}>
              <View style={s.stepper}>
                <TouchableOpacity
                  style={[s.stepBtn, (qty <= effectiveMin || outOfStock) && s.stepBtnDisabled]}
                  onPress={() => setQty((p) => Math.max(effectiveMin, p - 1))}
                  activeOpacity={0.8}
                  disabled={outOfStock || qty <= effectiveMin}
                >
                  <Ionicons
                    name="remove"
                    size={16}
                    color={qty <= effectiveMin || outOfStock ? colors.disabled : colors.textPrimary}
                  />
                </TouchableOpacity>
                <View style={s.stepNumBox}>
                  <Text style={s.stepNum}>{displayQty}</Text>
                </View>
                <TouchableOpacity
                  style={[s.stepBtn, qty >= effectiveMax && s.stepBtnDisabled]}
                  onPress={() => setQty((p) => Math.min(effectiveMax, p + 1))}
                  activeOpacity={0.8}
                  disabled={outOfStock || qty >= effectiveMax}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={qty >= effectiveMax || outOfStock ? colors.disabled : colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <View style={s.stepperTotal}>
                <Text style={s.stepperTotalLabel}>Total</Text>
                <Text style={s.stepperTotalValue}>₹{formatPrice(total)}</Text>
              </View>
            </View>
          )}

          {/* Validation hints */}
          {isZeroWeight && (
            <View style={s.validationRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
              <Text style={s.validationText}>Please enter a weight greater than 0</Text>
            </View>
          )}
          {belowMin && displayQty > 0 && (
            <View style={s.validationRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
              <Text style={s.validationText}>
                Minimum order is {effectiveMin}{isCustomWeight ? ` ${baseUnit}` : ""}
              </Text>
            </View>
          )}
          {exceedsStock && displayQty > 0 && (
            <View style={s.validationRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
              <Text style={s.validationText}>
                Only {effectiveMax}{isCustomWeight ? ` ${baseUnit}` : ""} available
              </Text>
            </View>
          )}
          {displayQty >= effectiveMax && displayQty > 0 && effectiveMax < Infinity && (
            <View style={s.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
              <Text style={s.hintText}>
                Consider selecting below max {isCustomWeight ? baseUnit : "quantity"} for better availability.
              </Text>
            </View>
          )}

          {/* Stock indicator */}
          {!outOfStock && availableStock > 0 && availableStock <= 10 && (
            <View style={s.lowStockBanner}>
              <Ionicons name="time-outline" size={13} color="#D97706" />
              <Text style={s.lowStockText}>Only {availableStock} left in stock!</Text>
            </View>
          )}
        </View>

        {/* ── Similar products ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}>
              <Ionicons name="grid-outline" size={14} color={colors.primary} />
            </View>
            <Text style={s.cardTitle}>You May Also Like</Text>
            {showDummy ? <Text style={s.demoNote}>demo</Text> : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.similarList}
          >
            {showDummy
              ? DUMMY_SIMILAR.map((p) => (
                  <DummySimilarCard key={p._id} item={p} cardWidth={similarW} />
                ))
              : similarProducts.map((p) => (
                  <SimilarCard key={p._id} item={p} cardWidth={similarW} />
                ))
            }
          </ScrollView>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[s.cartBtn, !canAddToCart && s.ctaDisabled]}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={!canAddToCart || cartLoading}
        >
          <Ionicons
            name="cart-outline"
            size={18}
            color={canAddToCart ? colors.primary : colors.disabled}
          />
          <Text style={[s.cartBtnText, !canAddToCart && s.ctaDisabledText]}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.buyBtn, !canAddToCart && s.ctaDisabled]}
          activeOpacity={0.85}
          onPress={handleBuyNow}
          disabled={!canAddToCart || cartLoading}
        >
          <Text style={s.buyBtnText}>
            {!canAddToCart
              ? exceedsStock
                ? "Reduce quantity"
                : belowMin
                  ? `Min ${effectiveMin}${isCustomWeight ? ` ${baseUnit}` : ""}`
                  : "Out of Stock"
              : "Buy Now"}
          </Text>
          {canAddToCart && (
            <>
              <View style={s.buyDivider} />
              <Text style={s.buyBtnPrice}>₹{formatPrice(total)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6F9" },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },

  // ── Hero ──
  heroBox: {
    backgroundColor: "#0F1923",
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroImgEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2533",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    // manual gradient via layers
    backgroundColor: "rgba(0,0,0,0)",
  },
  dotRow: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#fff",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  heroBtnGroup: { flexDirection: "row", gap: 8 },
  heroBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    bottom: 16,
    right: SCREEN_PADDING,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // ── Main info card ──
  mainCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: -20,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  namePriceRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 14,
  },
  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  productDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  pricePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 80,
  },
  origPrice: {
    fontSize: 10,
    color: colors.disabled,
    textDecorationLine: "line-through",
    marginBottom: 1,
  },
  displayPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 1,
  },

  // Trust badges
  trustRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F6F9",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#EAEDF2",
  },
  trustLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },

  // ── Generic card ──
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  demoNote: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  // ── Variants ──
  varList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: -8,
    marginBottom: -8,
  },
  varChip: {
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    minWidth: 72,
    alignItems: "center",
    position: "relative",
    marginRight: 8,
    marginBottom: 8,
  },
  varChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#EEF2FF",
  },
  varOfferDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  varLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 2,
  },
  varLabelActive: { color: colors.primary },
  varPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  varPriceActive: { color: colors.primary },

  // ── Quantity stepper ──
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F9",
    borderRadius: 14,
    padding: 4,
    gap: 0,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  stepBtnDisabled: {
    backgroundColor: "#F4F6F9",
    shadowOpacity: 0,
    elevation: 0,
  },
  stepNumBox: {
    width: 48,
    alignItems: "center",
  },
  stepNum: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  stepperTotal: {
    alignItems: "flex-end",
  },
  stepperTotalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  stepperTotalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // ── Custom weight input ──
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  weightInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F9",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    overflow: "hidden",
  },
  weightInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    paddingRight: 14,
    paddingLeft: 4,
  },
  weightTotal: { alignItems: "flex-end" },
  weightTotalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  weightTotalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // Validation
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  validationText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: "600",
    flex: 1,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    flex: 1,
  },
  lowStockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  lowStockText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "700",
  },

  // ── Similar ──
  similarList: {
    gap: 10,
    paddingRight: 4,
    paddingBottom: 2,
  },

  // ── Sticky CTA ──
  cta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 1000,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "#EEF2FF",
  },
  cartBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  buyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  buyDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 12,
  },
  buyBtnPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaDisabledText: { color: colors.disabled },
});