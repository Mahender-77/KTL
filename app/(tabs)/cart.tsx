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
  Dimensions,
} from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/context/CartContext";
import axiosInstance from "@/constants/api/axiosInstance";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { router, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Product, Variant } from "@/assets/types/product";
import Toast from "@/components/common/Toast";

const { width: SW } = Dimensions.get("window");
const SIMILAR_W = SW * 0.46;

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
  offerPrice?: number;
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
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const displayPrice = item.offerPrice ?? item.price ?? 0;
  const lineTotal = displayPrice * item.quantity;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Product image */}
      <Image
        source={{ uri: item.product?.images?.[0] ?? "" }}
        style={styles.itemImage}
        resizeMode="cover"
      />

      {/* Details */}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product?.name ?? "Product"}
        </Text>

        <Text style={styles.itemPrice}>₹{displayPrice.toLocaleString()}</Text>

        {/* Quantity controls */}
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() =>
              onUpdate(item.product._id, item.variant, item.quantity - 1)
            }
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={16} color={colors.primary} />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() =>
              onUpdate(item.product._id, item.variant, item.quantity + 1)
            }
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </TouchableOpacity>

          <Text style={styles.lineTotal}>₹{lineTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.product._id, item.variant)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cart-outline" size={64} color={colors.border} />
      </View>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySub}>
        Add some fresh products to get started
      </Text>
      <TouchableOpacity
        style={styles.shopBtn}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.85}
      >
        <Text style={styles.shopBtnText}>Start Shopping</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.card} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Related Product Card ─────────────────────────────────────────────────────
function RelatedProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (productId: string, variantId: string) => void }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const v = product.variants?.[0];
  const price = v?.offerPrice ?? v?.price ?? 0;
  const orig = v?.offerPrice ? v.price : null;
  const pct = v && v.offerPrice && v.offerPrice < v.price
    ? Math.round(((v.price - v.offerPrice) / v.price) * 100)
    : null;

  const handleAdd = async (e: any) => {
    e.stopPropagation?.();
    if (!v?._id) return;

    try {
      setAdding(true);
      await onAddToCart(product._id, v._id);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      console.log("Add to cart failed:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={relatedStyles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: "/product/[id]", params: { id: product._id } })}
      >
        <View style={relatedStyles.imgBox}>
          <Image
            source={{ uri: product.images?.[0] ?? "" }}
            style={relatedStyles.img}
            resizeMode="cover"
          />
          {pct && (
            <View style={relatedStyles.badge}>
              <Text style={relatedStyles.badgeT}>{pct}% OFF</Text>
            </View>
          )}
        </View>
        <View style={relatedStyles.info}>
          <Text style={relatedStyles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {v && (
            <Text style={relatedStyles.size}>
              {v.value} {v.unit}
            </Text>
          )}
          <View style={relatedStyles.priceRow}>
            {orig && (
              <Text style={relatedStyles.orig}>₹{orig.toLocaleString()}</Text>
            )}
            <Text style={relatedStyles.price}>₹{price.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={relatedStyles.btn}
            activeOpacity={0.85}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={relatedStyles.btnT}>+ Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      <Toast
        visible={showToast}
        message={`${product.name} added to cart!`}
        actionLabel="View Cart"
        onAction={() => {
          setShowToast(false);
        }}
        onDismiss={() => setShowToast(false)}
        duration={5000}
      />
    </>
  );
}

const relatedStyles = StyleSheet.create({
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
  imgBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeT: { color: colors.card, fontSize: 9, fontWeight: "800" },
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
    backgroundColor: colors.surface,
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
  price: { fontSize: 14, fontWeight: "800", color: colors.primary },
  orig: {
    fontSize: 10,
    color: colors.disabled,
    textDecorationLine: "line-through",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  btnT: { color: colors.card, fontSize: 11, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { removeFromCart, refreshCart, addToCart } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/cart");
      setItems(res.data.items ?? []);
      
      // Fetch related products based on cart items' categories
      if (res.data.items && res.data.items.length > 0) {
        fetchRelatedProducts(res.data.items);
      }
    } catch (err) {
      console.log("Cart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async (cartItems: CartItem[]) => {
    try {
      setLoadingRelated(true);
      // Get unique categories from cart items
      const categories = new Set<string>();
      
      // Fetch product details to get categories
      const productPromises = cartItems.map(item =>
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

      // Fetch related products from those categories
      if (categories.size > 0) {
        const categoryArray = Array.from(categories);
        const category = categoryArray[0]; // Use first category
        
        const res = await axiosInstance.get(
          `/api/products/public?category=${category}&limit=10`
        );
        const productList = (res.data?.data ?? []) as Product[];
        // Filter out products already in cart
        const cartProductIds = new Set(cartItems.map(item => item.product._id));
        const filtered = productList.filter(
          (p) => !cartProductIds.has(p._id)
        );
        
        setRelatedProducts(filtered.slice(0, 6)); // Limit to 6 products
      }
    } catch (err) {
      console.log("Related products fetch error:", err);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleAddRelatedToCart = async (productId: string, variantId: string) => {
    try {
      await addToCart(productId, variantId);
      await fetchCart(); // Refresh cart to show new item
    } catch (err) {
      console.log("Add to cart error:", err);
      throw err;
    }
  };

  // Fetch cart on mount and when screen comes into focus
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
      // Update items from API response to ensure consistency
      setItems(res.data.items ?? []);
      refreshCart();
    } catch (err) {
      console.log("Remove error:", err);
    }
  };

  const handleUpdate = async (
    productId: string,
    variantId: string,
    qty: number,
  ) => {
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
      // Refresh full list to stay in sync
      setItems(res.data.items ?? []);
      refreshCart();
    } catch (err) {
      console.log("Update error:", err);
    }
  };

  // Compute totals
  const subtotal = items.reduce((sum, item) => {
    const price = item.offerPrice ?? item.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
        translucent={false}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerBlob} />
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={async () => {
              try {
                await axiosInstance.delete("/api/cart/clear");
                setItems([]);
                refreshCart();
              } catch (err) {
                console.log("Clear cart error:", err);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your cart...</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          {/* ── Items List ── */}
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.product._id}-${item.variant}`}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onRemove={handleRemove}
                onUpdate={handleUpdate}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <>
                <View style={styles.summaryCard}>
                  {/* Free delivery notice */}
                  {deliveryFee > 0 && (
                    <View style={styles.freeDeliveryBar}>
                      <Ionicons
                        name="bicycle-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.freeDeliveryText}>
                        Add ₹{(500 - subtotal).toLocaleString()} more for free
                        delivery
                      </Text>
                    </View>
                  )}

                  {/* Summary rows */}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      ₹{subtotal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        deliveryFee === 0 && styles.freeText,
                      ]}
                    >
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ₹{total.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Related Products Section */}
                {relatedProducts.length > 0 && (
                  <View style={styles.relatedSection}>
                    <View style={styles.relatedHead}>
                      <View style={styles.relatedBar} />
                      <Text style={styles.relatedTitle}>You May Also Like</Text>
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
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            }
          />

          {/* ── Checkout CTA ── */}
          <View style={styles.ctaWrap}>
            <TouchableOpacity
              style={styles.cartBtn}
              activeOpacity={0.85}
              onPress={() => {
                // Keep cart open, just scroll to top or do nothing
              }}
            >
              <Ionicons name="cart-outline" size={18} color={colors.primary} />
              <Text style={styles.cartT}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buyBtn, checkingOut && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={checkingOut}
              onPress={() => {
                router.push("/checkout");
              }}
            >
              <Text style={styles.buyT}>Checkout</Text>
              <View style={styles.buyDiv} />
              <Text style={styles.buyPrice}>₹{total.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Header ──
  header: {
    backgroundColor: colors.primaryDark,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PADDING,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -50,
    right: -20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  clearBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, color: colors.textMuted },

  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  shopBtnText: { color: colors.card, fontSize: 14, fontWeight: "700" },

  // ── List ──
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // ── Item Card ──
  itemCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "center",
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginRight: 12,
  },
  itemDetails: { flex: 1 },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: "center",
  },
  lineTotal: {
    marginLeft: "auto" as any,
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ── Summary ──
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  freeDeliveryBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freeDeliveryText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  summaryValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "700" },
  freeText: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // ── Checkout CTA ──
  ctaWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 10,
    paddingBottom: 26,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
    borderColor: colors.primary,
  },
  cartT: { fontSize: 13, fontWeight: "700", color: colors.primary },
  buyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buyT: { fontSize: 14, fontWeight: "700", color: colors.card },
  buyDiv: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginHorizontal: 12,
  },
  buyPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.card,
    letterSpacing: -0.3,
  },

  // ── Related Products ──
  relatedSection: {
    backgroundColor: colors.card,
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  relatedHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 16,
    gap: 8,
  },
  relatedBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    flex: 1,
  },
  relatedList: {
    paddingHorizontal: SCREEN_PADDING,
    gap: 12,
  },
});

