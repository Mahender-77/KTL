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
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Variant, Product } from "@/assets/types/product";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";


const { width: SW } = Dimensions.get("window");
const SIMILAR_W = SW * 0.46;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDiscount(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}
function vLabel(v: Variant) { return `${v.value} ${v.unit}`; }

// ─── Dummy similar products for testing ───────────────────────────────────────
const DUMMY_SIMILAR = [
  { _id: "d1", name: "Fresh Tomatoes", image: "", price: 49, offerPrice: 39 },
  { _id: "d2", name: "Green Capsicum", image: "", price: 60, offerPrice: null },
  { _id: "d3", name: "Baby Spinach", image: "", price: 35, offerPrice: 29 },
  { _id: "d4", name: "Red Onion", image: "", price: 55, offerPrice: 45 },
];

// ─── Similar Card (dummy version) ─────────────────────────────────────────────
function DummySimilarCard({ item }: { item: typeof DUMMY_SIMILAR[0] }) {
  const pct = item.offerPrice
    ? Math.round(((item.price - item.offerPrice) / item.price) * 100)
    : null;
  const displayPrice = item.offerPrice ?? item.price;

  return (
    <View style={sc.card}>
      {/* Image placeholder */}
      <View style={sc.imgBox}>
        <View style={sc.imgPlaceholder}>
          <Ionicons name="leaf-outline" size={36} color={colors.primaryLight} />
        </View>
        {pct && (
          <View style={sc.badge}>
            <Text style={sc.badgeT}>{pct}% OFF</Text>
          </View>
        )}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        <Text style={sc.size}>500 g</Text>
        <View style={sc.priceRow}>
          {item.offerPrice && (
            <Text style={sc.orig}>₹{item.price}</Text>
          )}
          <Text style={sc.price}>₹{displayPrice}</Text>
        </View>
        <TouchableOpacity style={sc.btn} activeOpacity={0.85}>
          <Text style={sc.btnT}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Real Similar Card ─────────────────────────────────────────────────────────
function SimilarCard({ item }: { item: Product }) {
  const router = useRouter();
  const v = item.variants[0];
  const price = v?.offerPrice ?? v?.price ?? 0;
  const orig = v?.offerPrice ? v.price : null;
  const pct = v ? getDiscount(v) : null;

  return (
    <TouchableOpacity
      style={sc.card}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: item._id } })}
    >
      <View style={sc.imgBox}>
        <Image source={{ uri: item.images?.[0] ?? "" }} style={sc.img} resizeMode="cover" />
        {pct && (
          <View style={sc.badge}>
            <Text style={sc.badgeT}>{pct}% OFF</Text>
          </View>
        )}
      </View>
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={2}>{item.name}</Text>
        {v && <Text style={sc.size}>{vLabel(v)}</Text>}
        <View style={sc.priceRow}>
          {orig && <Text style={sc.orig}>₹{orig.toLocaleString()}</Text>}
          <Text style={sc.price}>₹{price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={sc.btn} activeOpacity={0.85}>
          <Text style={sc.btnT}>+ Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    width: SIMILAR_W,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imgBox: { width: "100%", aspectRatio: 1, backgroundColor: colors.surface, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: {
    width: "100%", height: "100%",
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface,
  },
  badge: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  badgeT: { color: colors.card, fontSize: 9, fontWeight: "800" },
  info: { padding: 10 },
  name: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, lineHeight: 16, marginBottom: 4 },
  size: {
    fontSize: 10, fontWeight: "600", color: colors.primary,
    backgroundColor: colors.surface, alignSelf: "flex-start",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginBottom: 6, overflow: "hidden",
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  price: { fontSize: 14, fontWeight: "800", color: colors.primary },
  orig: { fontSize: 10, color: colors.disabled, textDecorationLine: "line-through" },
  btn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  btnT: { color: colors.card, fontSize: 11, fontWeight: "700" },
});

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  product: Product;
  similarProducts?: Product[];
  onBack?: () => void;
  onAddToCart?: (p: Product, v: Variant, qty: number) => void;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProductDetailScreen({
  product,
  similarProducts = [],
  onBack,
  onAddToCart,
}: Props) {
  const [varIdx, setVarIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const v = product.variants[varIdx];
  const pct = v ? getDiscount(v) : null;
  const price = v?.offerPrice ?? v?.price ?? 0;
  const orig = v?.offerPrice ? v.price : null;
  const total = price * qty;
  const images = product.images.length > 0 ? product.images : [""];

  // Use real similar products if available, otherwise show dummies
  const showDummy = similarProducts.length === 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Single root ScrollView — owns ALL vertical scrolling ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Hero image ── */}
        <View style={s.heroBox}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) =>
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.heroImg} resizeMode="cover" />
            ))}
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
              <TouchableOpacity style={s.hBtn} onPress={() => setLiked(l => !l)} activeOpacity={0.85}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={18}
                  color={liked ? colors.error : "#fff"}
                />
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

        {/* ── Main white card ── */}
        <View style={s.card}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={2}>{product.name}</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepBtn, qty <= 1 && s.stepOff]}
                onPress={() => setQty(q => Math.max(1, q - 1))}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={14} color={qty <= 1 ? colors.disabled : colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.stepNum}>{qty}</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setQty(q => q + 1)} activeOpacity={0.8}>
                <Ionicons name="add" size={14} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {product.description ? <Text style={s.desc}>{product.description}</Text> : null}

          {/* Variant selector */}
          <Text style={s.secLabel}>SELECT SIZE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.varRow}
          >
            {product.variants.map((vv, i) => {
              const isOn = i === varIdx;
              const vpct = getDiscount(vv);
              return (
                <TouchableOpacity
                  key={vv._id ?? i}
                  style={[s.varChip, isOn && s.varChipOn]}
                  onPress={() => { setVarIdx(i); setQty(1); }}
                  activeOpacity={0.8}
                >
                  {vpct && !isOn && <View style={s.varDot} />}
                  <Text style={[s.varSize, isOn && s.varSizeOn]}>{vLabel(vv)}</Text>
                  <Text style={[s.varPrice, isOn && s.varPriceOn]}>
                    ₹{(vv.offerPrice ?? vv.price).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Total + trust */}
          <View style={s.totalBox}>
            <View style={s.totalLeft}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalPrice}>₹{total.toLocaleString()}</Text>
              {orig && (
                <Text style={s.saving}>
                  Save ₹{((orig - price) * qty).toLocaleString()}
                </Text>
              )}
            </View>
            <View style={s.trustCol}>
              {[
                { icon: "leaf-outline", t: "100% Fresh" },
                { icon: "flash-outline", t: "Fast Delivery" },
                { icon: "shield-checkmark-outline", t: "Quality Assured" },
              ].map(c => (
                <View key={c.t} style={s.trustRow}>
                  <Ionicons name={c.icon as any} size={13} color={colors.primary} />
                  <Text style={s.trustT}>{c.t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Similar products ── always visible (dummy if no real data) ── */}
        <View style={s.simSection}>
          <View style={s.simHead}>
            <View style={s.simBar} />
            <Text style={s.simTitle}>You May Also Like</Text>
            {showDummy && (
              <Text style={s.simDummyNote}>(demo)</Text>
            )}
          </View>

          {/* Rendered as a plain horizontal row — NO nested ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.simList}
          >
            {showDummy
              ? DUMMY_SIMILAR.map(p => <DummySimilarCard key={p._id} item={p} />)
              : similarProducts.map(p => <SimilarCard key={p._id} item={p} />)
            }
          </ScrollView>
        </View>

        {/* Spacer so content clears the sticky CTA (52 + 10 + 26 = 88px) */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={s.cta}>
        <TouchableOpacity style={s.cartBtn} activeOpacity={0.85}>
          <Ionicons name="cart-outline" size={18} color={colors.primary} />
          <Text style={s.cartT}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.buyBtn}
          activeOpacity={0.85}
          onPress={() => onAddToCart?.(product, v, qty)}
        >
          <Text style={s.buyT}>Buy Now</Text>
          <View style={s.buyDiv} />
          <Text style={s.buyPrice}>₹{total.toLocaleString()}</Text>
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

  // Hero
  heroBox: { width: SW, height: SW * 0.9, backgroundColor: colors.surface, overflow: "hidden" },
  heroImg: { width: SW, height: SW * 0.9 },
  heroFade: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 130,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  dots: {
    position: "absolute", bottom: 72, alignSelf: "center",
    flexDirection: "row", gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotOn: { width: 16, backgroundColor: "#fff" },
  heroHeader: {
    position: "absolute", top: 50, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: SCREEN_PADDING,
  },
  hRight: { flexDirection: "row", gap: 8 },
  hBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center", justifyContent: "center",
  },
  heroDiscount: {
    position: "absolute", bottom: 24, right: SCREEN_PADDING,
    backgroundColor: colors.success,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  heroDiscountT: { color: colors.card, fontSize: 12, fontWeight: "800" },

  // Main card
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -22,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 18,
  },
  nameRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 6, gap: 8,
  },
  name: {
    flex: 1, fontSize: 28, fontWeight: "800",
    color: colors.textPrimary, lineHeight: 34, letterSpacing: -0.4,
  },
  stepper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 10, padding: 6, gap: 5,
  },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    elevation: 1, borderWidth: 1, borderColor: colors.border,
  },
  stepOff: { backgroundColor: colors.surface },
  stepNum: {
    fontSize: 15, fontWeight: "700", color: colors.textPrimary,
    minWidth: 26, textAlign: "center",
  },
  desc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 16 },

  // Variants
  secLabel: {
    fontSize: 10, fontWeight: "700", color: colors.textMuted,
    letterSpacing: 1.2, marginBottom: 10,
  },
  varRow: { gap: 8, paddingBottom: 2, marginBottom: 16 },
  varChip: {
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.surface, minWidth: 70, alignItems: "center",
    position: "relative",
  },
  varChipOn: { borderColor: colors.primary, backgroundColor: colors.surface },
  varDot: {
    position: "absolute", top: 5, right: 5,
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight,
  },
  varSize: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 1 },
  varSizeOn: { color: colors.primary },
  varPrice: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  varPriceOn: { color: colors.primary },

  // Total box
  totalBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14, justifyContent: "space-between",
    borderWidth: 1, borderColor: colors.border,
  },
  totalLeft: { flex: 1 },
  totalLabel: {
    fontSize: 10, color: colors.textMuted, fontWeight: "700",
    letterSpacing: 1, marginBottom: 2,
  },
  totalPrice: { fontSize: 26, fontWeight: "900", color: colors.primary, letterSpacing: -0.5 },
  saving: { fontSize: 11, color: colors.success, fontWeight: "600", marginTop: 2 },
  trustCol: { gap: 6 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustT: { fontSize: 11, color: colors.textSecondary, fontWeight: "500" },

  // Similar section
  simSection: {
    backgroundColor: colors.card,
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  simHead: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SCREEN_PADDING, marginBottom: 16, gap: 8,
  },
  simBar: { width: 4, height: 20, backgroundColor: colors.primary, borderRadius: 2 },
  simTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary, flex: 1 },
  simDummyNote: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  simList: { paddingHorizontal: SCREEN_PADDING, gap: 12 },

  // CTA bar
  cta: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 10, paddingBottom: 26,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.divider,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  cartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingHorizontal: 16, height: 52,
    borderRadius: 14, borderWidth: 2, borderColor: colors.primary,
  },
  cartT: { fontSize: 13, fontWeight: "700", color: colors.primary },
  buyBtn: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  buyT: { fontSize: 14, fontWeight: "700", color: colors.card },
  buyDiv: {
    width: 1, height: 18,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginHorizontal: 12,
  },
  buyPrice: { fontSize: 15, fontWeight: "900", color: colors.card, letterSpacing: -0.3 },
});