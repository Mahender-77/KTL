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

const { width: SW } = Dimensions.get("window");
const SIMILAR_W = SW * 0.46;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDiscount(v: Variant): number | null {
  if (!v.offerPrice || v.offerPrice >= v.price) return null;
  return Math.round(((v.price - v.offerPrice) / v.price) * 100);
}
function vLabel(v: Variant) { return `${v.value} ${v.unit}`; }

// ─── Similar Card ─────────────────────────────────────────────────────────────
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
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  imgBox: { width: "100%", aspectRatio: 1, backgroundColor: "#F4F1EC", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  badge: {
    position: "absolute", top: 6, left: 6,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  badgeT: { color: "#fff", fontSize: 9, fontWeight: "800" },
  info: { padding: 10 },
  name: { fontSize: 12, fontWeight: "700", color: "#1A1A2E", lineHeight: 16, marginBottom: 4 },
  size: {
    fontSize: 10, fontWeight: "600", color: "#FF6B35",
    backgroundColor: "#FFF3ED", alignSelf: "flex-start",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginBottom: 6, overflow: "hidden",
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  price: { fontSize: 14, fontWeight: "800", color: "#FF6B35" },
  orig: { fontSize: 10, color: "#C0BDB8", textDecorationLine: "line-through" },
  btn: { backgroundColor: "#1A1A2E", borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  btnT: { color: "#fff", fontSize: 11, fontWeight: "700" },
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ════ SINGLE ROOT ScrollView — nothing else scrolls vertically ════ */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Hero image (horizontal ScrollView, not FlatList) ── */}
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

          {/* Dark bottom fade */}
          <View style={s.heroFade} pointerEvents="none" />

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIdx && s.dotOn]} />
              ))}
            </View>
          )}

          {/* Floating buttons over image */}
          <View style={s.heroHeader}>
            <TouchableOpacity style={s.hBtn} onPress={onBack} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.hRight}>
              <TouchableOpacity style={s.hBtn} onPress={() => setLiked(l => !l)} activeOpacity={0.85}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={18}
                  color={liked ? "#FF6B35" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={s.hBtn} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price overlay on image bottom-left */}
          <View style={s.heroPrice}>
            {orig && <Text style={s.heroPriceOrig}>₹{orig.toLocaleString()}</Text>}
            <Text style={s.heroPriceMain}>₹{price.toLocaleString()}</Text>
          </View>

          {pct && (
            <View style={s.heroDiscount}>
              <Text style={s.heroDiscountT}>{pct}% OFF</Text>
            </View>
          )}
        </View>

        {/* ── White card slides up over image ── */}
        <View style={s.card}>

          {/* Name row + stepper */}
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={2}>{product.name}</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepBtn, qty <= 1 && s.stepOff]}
                onPress={() => setQty(q => Math.max(1, q - 1))}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={14} color={qty <= 1 ? "#CCC" : "#1A1A2E"} />
              </TouchableOpacity>
              <Text style={s.stepNum}>{qty}</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setQty(q => q + 1)} activeOpacity={0.8}>
                <Ionicons name="add" size={14} color="#1A1A2E" />
              </TouchableOpacity>
            </View>
          </View>

          {product.description ? (
            <Text style={s.desc}>{product.description}</Text>
          ) : null}

          {/* ── Variant selector ── */}
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

          {/* ── Total + trust badges ── */}
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
                  <Ionicons name={c.icon as any} size={13} color="#FF6B35" />
                  <Text style={s.trustT}>{c.t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Similar products — horizontal ScrollView (NOT FlatList) ── */}
        {similarProducts.length > 0 && (
          <View style={s.simSection}>
            <View style={s.simHead}>
              <View style={s.simBar} />
              <Text style={s.simTitle}>You May Also Like</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.simList}
            >
              {similarProducts.map(p => (
                <SimilarCard key={p._id} item={p} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spacer — only enough for the sticky bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={s.cta}>
        <TouchableOpacity style={s.cartBtn} activeOpacity={0.85}>
          <Ionicons name="cart-outline" size={18} color="#FF6B35" />
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
  root: { flex: 1, backgroundColor: "#F2EFE9" },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },      // ← flexGrow not fixed height — no phantom space

  // Hero
  heroBox: {
    width: SW,
    height: SW * 0.9,
    backgroundColor: "#E8E4DC",
    overflow: "hidden",
  },
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
  heroPrice: {
    position: "absolute", bottom: 20, left: SCREEN_PADDING,
    flexDirection: "row", alignItems: "baseline", gap: 8,
  },
  heroPriceOrig: {
    fontSize: 15, color: "rgba(255,255,255,0.55)",
    textDecorationLine: "line-through",
  },
  heroPriceMain: {
    fontSize: 30, fontWeight: "900", color: "#fff", letterSpacing: -0.5,
  },
  heroDiscount: {
    position: "absolute", bottom: 24, right: SCREEN_PADDING,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  heroDiscountT: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Main card
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -22,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 18,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 21,
    fontWeight: "800",
    color: "#1A1A2E",
    lineHeight: 27,
    letterSpacing: -0.4,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2EFE9",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    elevation: 1,
  },
  stepOff: { backgroundColor: "#ECEAE6" },
  stepNum: {
    fontSize: 15, fontWeight: "700", color: "#1A1A2E",
    minWidth: 26, textAlign: "center",
  },
  desc: {
    fontSize: 13, color: "#999", lineHeight: 19, marginBottom: 16,
  },

  // Variant
  secLabel: {
    fontSize: 10, fontWeight: "700", color: "#BBB",
    letterSpacing: 1.2, marginBottom: 10,
  },
  varRow: { gap: 8, paddingBottom: 2, marginBottom: 16 },
  varChip: {
    borderWidth: 1.5, borderColor: "#E4E1DB",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "#FAFAF8", minWidth: 70, alignItems: "center",
    position: "relative",
  },
  varChipOn: { borderColor: "#FF6B35", backgroundColor: "#FFF3ED" },
  varDot: {
    position: "absolute", top: 5, right: 5,
    width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF6B35",
  },
  varSize: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 1 },
  varSizeOn: { color: "#FF6B35" },
  varPrice: { fontSize: 11, fontWeight: "500", color: "#999" },
  varPriceOn: { color: "#FF6B35" },

  // Total box
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F7F3",
    borderRadius: 16,
    padding: 14,
    justifyContent: "space-between",
  },
  totalLeft: { flex: 1 },
  totalLabel: { fontSize: 10, color: "#BBB", fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  totalPrice: { fontSize: 26, fontWeight: "900", color: "#FF6B35", letterSpacing: -0.5 },
  saving: { fontSize: 11, color: "#4CAF7D", fontWeight: "600", marginTop: 2 },
  trustCol: { gap: 6 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustT: { fontSize: 11, color: "#777", fontWeight: "500" },

  // Similar
  simSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingTop: 18,
    paddingBottom: 20,
  },
  simHead: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SCREEN_PADDING, marginBottom: 14, gap: 8,
  },
  simBar: { width: 4, height: 18, backgroundColor: "#FF6B35", borderRadius: 2 },
  simTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A2E" },
  simList: { paddingHorizontal: SCREEN_PADDING, gap: 10 },

  // CTA
  cta: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 10,
    paddingBottom: 26,
    backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#EDEBE6",
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  cartT: { fontSize: 13, fontWeight: "700", color: "#FF6B35" },
  buyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1A1A2E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buyT: { fontSize: 14, fontWeight: "700", color: "#fff" },
  buyDiv: {
    width: 1, height: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 12,
  },
  buyPrice: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
});