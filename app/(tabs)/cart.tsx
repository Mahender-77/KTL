// app/(tabs)/cart.tsx
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Animated,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Loader from "@/components/common/Loader";
import { useEffect, useState, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/context/CartContext";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { router, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Product, Variant } from "@/assets/types/product";
import { useFeedback } from "@/context/FeedbackContext";
import { parseImageUri } from "@/utils/imageUri";


interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  variant: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  offerPrice?: number;
  dealDiscountPercent?: number;
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onRemove,
  onUpdate,
}: {
  item: CartItem;
  onRemove: (productId: string, variantId: string) => void;
  onUpdate: (productId: string, variantId: string, qty: number) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const rawPrice = Number(item.price);
  const rawOriginal = item.originalPrice != null ? Number(item.originalPrice) : 0;
  const displayPrice = rawPrice > 0 ? rawPrice : rawOriginal > 0 ? rawOriginal : 0;
  const lineTotal = displayPrice * item.quantity;
  const thumbUri = parseImageUri(item.product?.images?.[0]);

  return (
    <Animated.View
      style={[
        styles.itemCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Image */}
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={[styles.itemImage, styles.itemImageEmpty]}>
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        </View>
      )}

      {/* Details */}
      <View style={styles.itemDetails}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.product?.name ?? "Product"}
          </Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => onRemove(item.product._id, item.variant)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemPriceRow}>
          {item.dealDiscountPercent != null && (
            <View style={styles.dealBadge}>
              <Text style={styles.dealBadgeText}>{item.dealDiscountPercent}% OFF</Text>
            </View>
          )}
          <Text style={styles.itemUnitPrice}>₹{displayPrice.toLocaleString()}</Text>
        </View>

        {/* Qty stepper + line total */}
        <View style={styles.itemBottom}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdate(item.product._id, item.variant, item.quantity - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepNum}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onUpdate(item.product._id, item.variant, item.quantity + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lineTotal}>₹{lineTotal.toLocaleString()}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cart-outline" size={48} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySub}>Add some fresh products to get started</Text>
      <TouchableOpacity
        style={styles.shopBtn}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.85}
      >
        <Text style={styles.shopBtnText}>Start Shopping</Text>
        <Ionicons name="arrow-forward" size={15} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Related Product Card ─────────────────────────────────────────────────────
function RelatedProductCard({
  product,
  onAddToCart,
  cardWidth,
}: {
  product: Product;
  onAddToCart: (productId: string, variantId: string) => void;
  cardWidth: number;
}) {
  const router = useRouter();
  const { showToast, hideToast } = useFeedback();
  const [adding, setAdding] = useState(false);

  const v = product.variants?.[0];
  const hasValidOffer = v && v.offerPrice != null && v.offerPrice > 0 && v.offerPrice < v.price;
  const price = v ? (hasValidOffer ? v.offerPrice! : v.price ?? 0) : 0;
  const orig = hasValidOffer && v ? v.price : null;
  const pct =
    v && v.offerPrice && v.offerPrice < v.price
      ? Math.round(((v.price - v.offerPrice) / v.price) * 100)
      : null;
  const relatedImgUri = parseImageUri(product.images?.[0]);

  const handleAdd = async (e: any) => {
    e.stopPropagation?.();
    if (!v?._id) return;
    try {
      setAdding(true);
      await onAddToCart(product._id, v._id);
      showToast({
        variant: "success",
        title: "Added to cart",
        message: `${product.name} added to cart!`,
        actionLabel: "Dismiss",
        onAction: () => hideToast(),
        duration: 5000,
      });
    } catch (err) {
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[rStyles.card, { width: cardWidth }]}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: "/product/[id]", params: { id: product._id } })}
      >
        <View style={rStyles.imgBox}>
          {relatedImgUri ? (
            <Image source={{ uri: relatedImgUri }} style={rStyles.img} resizeMode="cover" />
          ) : (
            <View style={[rStyles.img, rStyles.imgEmpty]}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            </View>
          )}
          {pct ? (
            <View style={rStyles.badge}>
              <Text style={rStyles.badgeText}>{pct}% OFF</Text>
            </View>
          ) : null}
        </View>
        <View style={rStyles.info}>
          <Text style={rStyles.name} numberOfLines={2}>{product.name}</Text>
          {v ? (
            <Text style={rStyles.size}>{v.value} {v.unit}</Text>
          ) : null}
          <View style={rStyles.priceRow}>
            {orig ? <Text style={rStyles.orig}>₹{orig.toLocaleString()}</Text> : null}
            <Text style={rStyles.price}>₹{price.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={rStyles.addBtn}
            activeOpacity={0.85}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={13} color="#fff" />
                <Text style={rStyles.addBtnText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );
}

const rStyles = StyleSheet.create({
  card: {
    minWidth: 120,
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
  imgEmpty: {
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
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
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
    marginBottom: 8,
  },
  price: { fontSize: 13, fontWeight: "800", color: colors.primary },
  orig: { fontSize: 10, color: colors.disabled, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 7,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  addBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const similarW = SW * 0.44;
  const { removeFromCart, refreshCart, addToCart } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [storeDeliveryFee, setStoreDeliveryFee] = useState<number | null>(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/cart");
      setItems(res.data.items ?? []);
      axiosInstance
        .get("/api/stores/public")
        .then((storeRes) => {
          const fee = storeRes.data?.data?.[0]?.deliveryFee;
          if (typeof fee === "number" && fee >= 0) setStoreDeliveryFee(fee);
        })
        .catch(() => {});
      if (res.data.items && res.data.items.length > 0) {
        fetchRelatedProducts(res.data.items);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (cartItems: CartItem[]) => {
    try {
      setLoadingRelated(true);
      const categories = new Set<string>();
      const productPromises = cartItems.map((item) =>
        axiosInstance.get(`/api/products/public/${item.product._id}`)
      );
      const productResponses = await Promise.allSettled(productPromises);
      productResponses.forEach((result) => {
        if (result.status === "fulfilled" && result.value.data?.category) {
          const cat = result.value.data.category;
          const catId = typeof cat === "object" && cat?._id ? cat._id : cat;
          if (catId) categories.add(String(catId));
        }
      });
      if (categories.size > 0) {
        const category = Array.from(categories)[0];
        const res = await axiosInstance.get(
          `/api/products/public?category=${category}&limit=10`
        );
        const productList = (res.data?.data ?? []) as Product[];
        const cartProductIds = new Set(cartItems.map((item) => item.product._id));
        setRelatedProducts(
          productList.filter((p) => !cartProductIds.has(p._id)).slice(0, 6)
        );
      }
    } catch (err) {
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleAddRelatedToCart = async (productId: string, variantId: string) => {
    try {
      await addToCart(productId, variantId);
      await fetchCart();
    } catch (err) {
      throw err;
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const handleRemove = async (productId: string, variantId: string) => {
    try {
      const res = await axiosInstance.delete("/api/cart/remove", {
        data: { productId, variantId },
      });
      setItems(res.data.items ?? []);
      refreshCart();
    } catch (err) {}
  };

  const handleUpdate = async (productId: string, variantId: string, qty: number) => {
    try {
      if (qty <= 0) {
        await handleRemove(productId, variantId);
        return;
      }
      const res = await axiosInstance.patch("/api/cart/update", {
        productId,
        variantId,
        quantity: qty,
      });
      setItems(res.data.items ?? []);
      refreshCart();
    } catch (err) {}
  };

  const subtotal = items.reduce((sum, item) => {
    const p = Number(item.price);
    const orig = item.originalPrice != null ? Number(item.originalPrice) : 0;
    const price = p > 0 ? p : orig > 0 ? orig : 0;
    return sum + price * item.quantity;
  }, 0);
  const baseDeliveryFee = storeDeliveryFee != null ? storeDeliveryFee : 40;
  const deliveryFee = subtotal > 500 ? 0 : baseDeliveryFee;
  const total = subtotal + deliveryFee;
  const amountToFreeDelivery = 500 - subtotal;

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F6F9" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Cart</Text>
          {items.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{items.length}</Text>
            </View>
          )}
        </View>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={async () => {
              try {
                await axiosInstance.delete("/api/cart/clear");
                setItems([]);
                refreshCart();
              } catch (err) {}
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Loader variant="fullscreen" message="Loading your cart..." />
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.product._id}-${item.variant}`}
            renderItem={({ item }) => (
              <CartItemRow item={item} onRemove={handleRemove} onUpdate={handleUpdate} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              /* Free delivery progress bar */
              deliveryFee > 0 && amountToFreeDelivery > 0 ? (
                <View style={styles.freeDeliveryCard}>
                  <View style={styles.freeDeliveryTop}>
                    <Ionicons name="bicycle-outline" size={16} color={colors.primary} />
                    <Text style={styles.freeDeliveryMsg}>
                      Add <Text style={styles.freeDeliveryAmount}>₹{Math.ceil(amountToFreeDelivery)}</Text> more for free delivery
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min((subtotal / 500) * 100, 100)}%` as any },
                      ]}
                    />
                  </View>
                </View>
              ) : deliveryFee === 0 ? (
                <View style={styles.freeDeliveryCard}>
                  <View style={styles.freeDeliveryTop}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.freeDeliveryMsg, { color: colors.success }]}>
                      You've unlocked free delivery!
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, styles.progressFillFull, { width: "100%" }]} />
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              <>
                {/* ── Price summary ── */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryCardIcon}>
                      <Ionicons name="receipt" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.summaryCardTitle}>Price Details</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Price ({items.length} items)</Text>
                    <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Charges</Text>
                    <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeText]}>
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
                  </View>
                  {deliveryFee === 0 && (
                    <View style={styles.savingsBanner}>
                      <Ionicons name="pricetag" size={12} color={colors.success} />
                      <Text style={styles.savingsText}>
                        You saved ₹{baseDeliveryFee} on delivery charges
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Related products ── */}
                {relatedProducts.length > 0 && (
                  <View style={styles.relatedCard}>
                    <View style={styles.relatedHeader}>
                      <View style={styles.relatedHeaderLeft}>
                        <View style={styles.relatedIcon}>
                          <Ionicons name="grid-outline" size={14} color={colors.primary} />
                        </View>
                        <Text style={styles.relatedTitle}>You May Also Like</Text>
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.relatedList}
                    >
                      {relatedProducts.map((product) => (
                        <RelatedProductCard
                          key={product._id}
                          product={product}
                          onAddToCart={handleAddRelatedToCart}
                          cardWidth={similarW}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            }
          />

          {/* ── Checkout CTA ── */}
          <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.ctaTotal}>
              <Text style={styles.ctaTotalValue}>₹{total.toLocaleString()}</Text>
              <Text style={styles.ctaTotalSub}>{items.length} item{items.length > 1 ? "s" : ""}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={checkingOut}
              onPress={() => router.push("/checkout")}
            >
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header ──
  header: {
    backgroundColor: "#0F1923",
    paddingBottom: 14,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  clearBtnText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" },

  // ── List ──
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 0,
  },

  // ── Free delivery progress ──
  freeDeliveryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EAEDF2",
  },
  freeDeliveryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  freeDeliveryMsg: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
    flex: 1,
  },
  freeDeliveryAmount: {
    color: colors.primary,
    fontWeight: "800",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#F4F6F9",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressFillFull: {
    backgroundColor: colors.success,
  },

  // ── Item Card ──
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    alignItems: "flex-start",
    gap: 12,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F4F6F9",
    flexShrink: 0,
  },
  itemImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: { flex: 1 },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F4F6F9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dealBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  itemUnitPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  itemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F9",
    borderRadius: 10,
    padding: 3,
    gap: 0,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: "center",
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.3,
  },

  // ── Summary card ──
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  summaryCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  summaryValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "700" },
  freeText: { color: colors.success, fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: "#F4F6F9", marginVertical: 6 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  savingsText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: "600",
  },

  // ── Related card ──
  relatedCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  relatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  relatedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  relatedIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  relatedList: {
    paddingHorizontal: 16,
    gap: 10,
  },

  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    backgroundColor: "#F4F6F9",
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shopBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── CTA ──
  ctaWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  ctaTotal: { gap: 2 },
  ctaTotalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  ctaTotalSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  checkoutBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});