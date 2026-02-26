// components/product/ProductDetailScreen.tsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Variant, Product } from "@/assets/types/product";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

const { width: SW } = Dimensions.get("window");
const SIMILAR_W = SW * 0.46;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiscount(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}

function vLabel(v: Variant) { return `${v.value} ${v.unit}`; }

/** Sum available stock for a variant across all stores */
function getAvailableStockForVariant(
  stockByStoreVariant: Product["stockByStoreVariant"],
  variantId: string | undefined
): number {
  if (!variantId || !stockByStoreVariant?.length) return 0;
  return stockByStoreVariant
    .filter((s) => String(s.variant) === String(variantId))
    .reduce((sum, s) => sum + (s.availableStock ?? 0), 0);
}

/** Compute price including tax */
function withTax(price: number, taxRate?: number | null): number {
  if (!taxRate || taxRate <= 0) return price;
  return price * (1 + taxRate / 100);
}

// ─── Dummy similar products ───────────────────────────────────────────────────

const DUMMY_SIMILAR = [
  { _id: "d1", name: "Fresh Tomatoes",  price: 49, offerPrice: 39 },
  { _id: "d2", name: "Green Capsicum",  price: 60, offerPrice: null },
  { _id: "d3", name: "Baby Spinach",    price: 35, offerPrice: 29 },
  { _id: "d4", name: "Red Onion",       price: 55, offerPrice: 45 },
];

// ─── Similar Card ─────────────────────────────────────────────────────────────

function DummySimilarCard({ item }: { item: typeof DUMMY_SIMILAR[0] }) {
  const pct = item.offerPrice
    ? Math.round(((item.price - item.offerPrice) / item.price) * 100)
    : null;
  return (
    <View style={sc.card}>
      <View style={sc.imgBox}>
        <View style={sc.imgPlaceholder}>
          <Ionicons name="leaf-outline" size={36} color={colors.primaryLight} />
        </View>
        {pct && <View style={sc.badge}><Text style={sc.badgeT}>{pct}% OFF</Text></View>}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        <Text style={sc.size}>500 g</Text>
        <View style={sc.priceRow}>
          {item.offerPrice && <Text style={sc.orig}>₹{item.price}</Text>}
          <Text style={sc.price}>₹{item.offerPrice ?? item.price}</Text>
        </View>
      </View>
    </View>
  );
}

function SimilarCard({ item }: { item: Product }) {
  const router = useRouter();
  const v = item.variants?.[0];
  const isFixed = item.pricingMode === "fixed";
  const basePrice = isFixed && v ? (v.offerPrice ?? v.price) : (item.pricePerUnit ?? 0);
  const displayPrice = withTax(basePrice, item.taxRate);
  const orig = isFixed && v?.offerPrice ? withTax(v.price, item.taxRate) : null;
  const pct = v ? getDiscount(v) : null;

  return (
    <TouchableOpacity
      style={sc.card}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: item._id } })}
    >
      <View style={sc.imgBox}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={sc.img} resizeMode="cover" />
        ) : (
          <View style={[sc.img, sc.imgPlaceholder]}>
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}
        {pct && <View style={sc.badge}><Text style={sc.badgeT}>{pct}% OFF</Text></View>}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        {v
          ? <Text style={sc.size}>{vLabel(v)}</Text>
          : <Text style={sc.size}>Per {item.baseUnit ?? "pcs"}</Text>
        }
        <View style={sc.priceRow}>
          {orig != null && <Text style={sc.orig}>₹{orig.toLocaleString()}</Text>}
          <Text style={sc.price}>₹{displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    width: SIMILAR_W, backgroundColor: colors.card, borderRadius: 16,
    overflow: "hidden", elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  imgBox: { width: "100%", aspectRatio: 1, backgroundColor: colors.surface, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  badge: { position: "absolute", top: 6, left: 6, backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeT: { color: colors.card, fontSize: 9, fontWeight: "800" },
  info: { padding: 10 },
  name: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, lineHeight: 16, marginBottom: 4 },
  size: { fontSize: 10, fontWeight: "600", color: colors.primary, backgroundColor: colors.surface, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 6, overflow: "hidden" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  price: { fontSize: 14, fontWeight: "800", color: colors.primary },
  orig: { fontSize: 10, color: colors.disabled, textDecorationLine: "line-through" },
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
  const { isInWishlist, addToWishlist, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { addToCart, loading: cartLoading } = useCart();

  const [varIdx, setVarIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  const pricingMode     = product.pricingMode ?? "unit";
  const baseUnit        = product.baseUnit    ?? "pcs";
  const taxRate         = product.taxRate;
  const minOrderQty     = product.minOrderQty;
  const maxOrderQty     = product.maxOrderQty;
  const pricePerUnit    = Number(product.pricePerUnit) || 0;
  const availableQty    = Number(product.availableQuantity) || 0;

  const isFixed        = pricingMode === "fixed";
  const isCustomWeight = pricingMode === "custom-weight";
  const isUnit         = pricingMode === "unit";

  const v = isFixed && product.variants?.length ? product.variants[varIdx] : null;

  const availableStock = isFixed
    ? getAvailableStockForVariant(product.stockByStoreVariant, v?._id)
    : availableQty;
  const outOfStock = availableStock <= 0;

  // Effective constraints taking minOrderQty / maxOrderQty into account
  const effectiveMin = minOrderQty ?? (isUnit ? 1 : 0.01);
  const effectiveMax = maxOrderQty ? Math.min(maxOrderQty, availableStock) : availableStock;

  // ── Quantity state ──
  const [qty, setQty]       = useState(Math.max(1, effectiveMin));       // unit / fixed
  const [qtyStr, setQtyStr] = useState(String(effectiveMin));             // custom-weight

  const displayQty   = isCustomWeight ? (parseFloat(qtyStr) || 0) : (outOfStock ? 0 : qty);
  const exceedsStock = displayQty > effectiveMax;
  const belowMin     = displayQty > 0 && displayQty < effectiveMin;

  // ── Price ──
  const basePrice    = isFixed && v ? (v.offerPrice ?? v.price) : pricePerUnit;
  const displayPrice = withTax(basePrice, taxRate);
  const origPrice    = isFixed && v?.offerPrice ? withTax(v.price, taxRate) : null;
  const pct          = v ? getDiscount(v) : null;
  const total        = displayPrice * displayQty;

  const images = (product.images ?? []).filter((u) => u && typeof u === "string" && u.trim().length > 0);
  const liked  = isInWishlist(product._id);

  // Clamp qty when variant changes
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
      Alert.alert("Login Required", "Please login to add items to your wishlist");
      return;
    }
    try {
      if (liked) await removeFromWishlist(product._id);
      else await addToWishlist(product._id);
    } catch (err) {
      console.log("Wishlist toggle error:", err);
    }
  };

  const canAddToCart = !outOfStock && !exceedsStock && !belowMin && displayQty > 0;

  const handleAddToCart = async () => {
    if (!canAddToCart || cartLoading) return;
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to your cart");
      return;
    }
    const variantId = isFixed && v?._id ? v._id : product._id;
    try {
      await addToCart(product._id, variantId, displayQty);
      Alert.alert("Added", "Item added to cart");
    } catch {
      Alert.alert("Error", "Could not add to cart");
    }
  };

  const showDummy = similarProducts.length === 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Hero image ── */}
        <View style={s.heroBox}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) =>
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {images.length > 0 ? (
              images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={s.heroImg} resizeMode="cover" />
              ))
            ) : (
              <View style={[s.heroImg, sc.imgPlaceholder]}>
                <Ionicons name="image-outline" size={64} color={colors.textMuted} />
              </View>
            )}
          </ScrollView>

          <View style={s.heroFade} pointerEvents="none" />

          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIdx && s.dotOn]} />
              ))}
            </View>
          )}

          <View style={s.heroHeader}>
            <TouchableOpacity style={s.hBtn} onPress={onBack} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.hRight}>
              <TouchableOpacity style={s.hBtn} onPress={handleToggleWishlist} activeOpacity={0.85} disabled={wishlistLoading}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? colors.error : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={s.hBtn} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {pct && (
            <View style={s.heroDiscount}>
              <Text style={s.heroDiscountT}>{pct}% OFF</Text>
            </View>
          )}
        </View>

        {/* ── Main card ── */}
        <View style={s.card}>
          <Text style={s.name} numberOfLines={2}>{product.name}</Text>
          {product.description ? <Text style={s.desc}>{product.description}</Text> : null}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={s.tagsScroll} contentContainerStyle={s.tagsRow}
            >
              {product.tags.map((tag) => (
                <View key={tag} style={s.tagChip}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Price — for custom-weight: ₹X per kg, total updates when user changes weight */}
          <View style={s.priceDisplayBox}>
            <Text style={s.priceDisplay}>
              ₹{displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {(isUnit || isCustomWeight) && ` / ${baseUnit}`}
            </Text>
            {isCustomWeight && (
              <Text style={s.priceHint}>
                Total = price × weight (updates as you enter)
              </Text>
            )}
            {origPrice != null && (
              <Text style={s.priceOrig}>
                MRP ₹{origPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            )}
            {taxRate != null && taxRate > 0 && (
              <Text style={s.taxNote}>Inclusive of {taxRate}% tax</Text>
            )}
          </View>

          {/* Stock */}
          <View style={s.stockRow}>
            {outOfStock ? (
              <Text style={s.outOfStockText}>Out of Stock</Text>
            ) : (
              <Text style={s.stockText}>
                {availableStock} {isFixed && v ? `${v.value} ${v.unit}` : baseUnit} available
              </Text>
            )}
          </View>

          {/* Order constraints info */}
          {(minOrderQty != null || maxOrderQty != null) && (
            <View style={s.constraintRow}>
              {minOrderQty != null && (
                <Text style={s.constraintText}>Min: {minOrderQty} {baseUnit}</Text>
              )}
              {maxOrderQty != null && (
                <Text style={s.constraintText}>Max: {maxOrderQty} {baseUnit}</Text>
              )}
            </View>
          )}

          {/* Quantity input */}
          <View style={s.nameRow}>
            <Text style={s.secLabel}>QUANTITY</Text>
            {isCustomWeight ? (
              <TextInput
                style={s.qtyInput}
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
            ) : (
              <View style={s.stepper}>
                <TouchableOpacity
                  style={[s.stepBtn, (qty <= effectiveMin || outOfStock) && s.stepOff]}
                  onPress={() => setQty((p) => Math.max(effectiveMin, p - 1))}
                  activeOpacity={0.8}
                  disabled={outOfStock || qty <= effectiveMin}
                >
                  <Ionicons
                    name="remove" size={14}
                    color={qty <= effectiveMin || outOfStock ? colors.disabled : colors.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={s.stepNum}>{displayQty}</Text>
                <TouchableOpacity
                  style={[s.stepBtn, qty >= effectiveMax && s.stepOff]}
                  onPress={() => setQty((p) => Math.min(effectiveMax, p + 1))}
                  activeOpacity={0.8}
                  disabled={outOfStock || qty >= effectiveMax}
                >
                  <Ionicons
                    name="add" size={14}
                    color={qty >= effectiveMax || outOfStock ? colors.disabled : colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Validation hints */}
          {belowMin && displayQty > 0 && (
            <Text style={s.errorText}>Minimum order is {effectiveMin} {baseUnit}</Text>
          )}
          {exceedsStock && displayQty > 0 && (
            <Text style={s.errorText}>
              Only {effectiveMax} {baseUnit} available
            </Text>
          )}

          {/* Variant selector */}
          {isFixed && product.variants && product.variants.length > 0 && (
            <>
              <Text style={s.secLabel}>SELECT SIZE</Text>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.varRow}
              >
                {product.variants.map((vv, i) => {
                  const isOn = i === varIdx;
                  const vpct = getDiscount(vv);
                  return (
                    <TouchableOpacity
                      key={vv._id ?? i}
                      style={[s.varChip, isOn && s.varChipOn]}
                      onPress={() => { setVarIdx(i); setQty(effectiveMin); }}
                      activeOpacity={0.8}
                    >
                      {vpct && !isOn && <View style={s.varDot} />}
                      <Text style={[s.varSize, isOn && s.varSizeOn]}>{vLabel(vv)}</Text>
                      <Text style={[s.varPrice, isOn && s.varPriceOn]}>
                        ₹{withTax(vv.offerPrice ?? vv.price, taxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Total */}
          <View style={s.totalBox}>
            <View style={s.totalLeft}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalPrice}>
                ₹{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
              {origPrice != null && origPrice > displayPrice && displayQty > 0 && (
                <Text style={s.saving}>
                  Save ₹{((origPrice - displayPrice) * displayQty).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Text>
              )}
              {taxRate != null && taxRate > 0 && displayQty > 0 && (
                <Text style={s.taxBreakdown}>
                  (incl. ₹{(total - displayQty * basePrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} tax)
                </Text>
              )}
            </View>
            <View style={s.trustCol}>
              {[
                { icon: "leaf-outline",              t: "100% Fresh" },
                { icon: "flash-outline",             t: "Fast Delivery" },
                { icon: "shield-checkmark-outline",  t: "Quality Assured" },
              ].map((c) => (
                <View key={c.t} style={s.trustRow}>
                  <Ionicons name={c.icon as any} size={13} color={colors.primary} />
                  <Text style={s.trustT}>{c.t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Similar products */}
        <View style={s.simSection}>
          <View style={s.simHead}>
            <View style={s.simBar} />
            <Text style={s.simTitle}>You May Also Like</Text>
            {showDummy && <Text style={s.simDummyNote}>(demo)</Text>}
          </View>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.simList}
          >
            {showDummy
              ? DUMMY_SIMILAR.map((p) => <DummySimilarCard key={p._id} item={p} />)
              : similarProducts.map((p) => <SimilarCard key={p._id} item={p} />)
            }
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={s.cta}>
        <TouchableOpacity
          style={[s.cartBtn, !canAddToCart && s.ctaDisabled]}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={!canAddToCart || cartLoading}
        >
          <Ionicons
            name="cart-outline" size={18}
            color={canAddToCart ? colors.primary : colors.disabled}
          />
          <Text style={[s.cartT, !canAddToCart && s.ctaDisabledT]}>Add to Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.buyBtn, !canAddToCart && s.ctaDisabled]}
          activeOpacity={0.85}
          onPress={() => {
            if (!canAddToCart) return;
            onAddToCart?.(product, v!, displayQty);
          }}
          disabled={!canAddToCart}
        >
          <Text style={s.buyT}>
            {!canAddToCart
              ? exceedsStock ? "Reduce quantity"
              : belowMin ? `Min ${effectiveMin} ${baseUnit}`
              : "Out of Stock"
              : "Buy Now"}
          </Text>
          {canAddToCart && (
            <>
              <View style={s.buyDiv} />
              <Text style={s.buyPrice}>
                ₹{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },

  heroBox: { width: SW, height: SW * 0.9, backgroundColor: colors.surface, overflow: "hidden" },
  heroImg: { width: SW, height: SW * 0.9 },
  heroFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 130, backgroundColor: "rgba(0,0,0,0.32)" },
  dots: { position: "absolute", bottom: 72, alignSelf: "center", flexDirection: "row", gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotOn: { width: 16, backgroundColor: "#fff" },
  heroHeader: { position: "absolute", top: 50, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SCREEN_PADDING },
  hRight: { flexDirection: "row", gap: 8 },
  hBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.38)", alignItems: "center", justifyContent: "center" },
  heroDiscount: { position: "absolute", bottom: 24, right: SCREEN_PADDING, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroDiscountT: { color: colors.card, fontSize: 12, fontWeight: "800" },

  card: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -22, paddingHorizontal: SCREEN_PADDING, paddingTop: 20, paddingBottom: 18 },
  name: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, lineHeight: 34, letterSpacing: -0.4, marginBottom: 8 },
  desc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 12 },

  tagsScroll: { marginBottom: 12 },
  tagsRow: { gap: 6, flexDirection: "row" },
  tagChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },

  priceDisplayBox: { marginBottom: 6 },
  priceDisplay: { fontSize: 32, fontWeight: "900", color: colors.primary, letterSpacing: -0.5 },
  priceOrig: { fontSize: 13, color: colors.disabled, textDecorationLine: "line-through", marginTop: 2 },
  priceHint: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  taxNote: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  stockRow: { marginBottom: 8 },
  stockText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  outOfStockText: { fontSize: 13, fontWeight: "700", color: colors.error },

  constraintRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  constraintText: { fontSize: 11, color: colors.textMuted, fontWeight: "600", backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 },
  secLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 1.2, marginBottom: 10 },
  qtyInput: { width: 100, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: "700", color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 10, padding: 6, gap: 5 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", elevation: 1, borderWidth: 1, borderColor: colors.border },
  stepOff: { backgroundColor: colors.surface },
  stepNum: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, minWidth: 26, textAlign: "center" },
  errorText: { fontSize: 12, color: colors.error, fontWeight: "600", marginBottom: 8 },

  varRow: { gap: 8, paddingBottom: 2, marginBottom: 16 },
  varChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, minWidth: 70, alignItems: "center", position: "relative" },
  varChipOn: { borderColor: colors.primary, backgroundColor: colors.surface },
  varDot: { position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  varSize: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 1 },
  varSizeOn: { color: colors.primary },
  varPrice: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  varPriceOn: { color: colors.primary },

  totalBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14, justifyContent: "space-between", borderWidth: 1, borderColor: colors.border },
  totalLeft: { flex: 1 },
  totalLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  totalPrice: { fontSize: 26, fontWeight: "900", color: colors.primary, letterSpacing: -0.5 },
  saving: { fontSize: 11, color: colors.success, fontWeight: "600", marginTop: 2 },
  taxBreakdown: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  trustCol: { gap: 6 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustT: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },

  simSection: { backgroundColor: colors.card, marginTop: 8, paddingTop: 20, paddingBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider },
  simHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: SCREEN_PADDING, marginBottom: 16, gap: 8 },
  simBar: { width: 4, height: 20, backgroundColor: colors.primary, borderRadius: 2 },
  simTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, flex: 1 },
  simDummyNote: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  simList: { paddingHorizontal: SCREEN_PADDING, gap: 12 },

  cta: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, paddingHorizontal: SCREEN_PADDING, paddingTop: 10, paddingBottom: 26, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider, elevation: 14, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8 },
  cartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16, height: 52, borderRadius: 14, borderWidth: 2, borderColor: colors.primary },
  cartT: { fontSize: 13, fontWeight: "700", color: colors.primary },
  buyBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  buyT: { fontSize: 14, fontWeight: "700", color: colors.card },
  buyDiv: { width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.35)", marginHorizontal: 12 },
  buyPrice: { fontSize: 15, fontWeight: "900", color: colors.card, letterSpacing: -0.3 },
  ctaDisabled: { opacity: 0.6 },
  ctaDisabledT: { color: colors.disabled },
});