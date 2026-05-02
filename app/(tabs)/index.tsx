// app/(tabs)/index.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "@/components/common/SearchBar";
import CategoriesList from "@/components/home/CategoriesList";
import BannerSlider from "@/components/home/BannerSlider";
import DealOfTheDay from "@/components/home/DealOfTheDay";
import CartBadge from "@/components/common/CartBadge";
import WishlistBadge from "@/components/common/WishlistBadge";
import CategoryProducts from "@/components/CategoryProducts";
import ProductGrid from "@/components/product/ProductGrid";
import SectionHeader from "@/components/common/SectionHeader";
import Loader from "@/components/common/Loader";
import { SCREEN_PADDING } from "@/constants/layout";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { router, useNavigation } from "expo-router";
import axiosInstance from "@/constants/api/axiosInstance";
import { fetchAllPublicProducts } from "@/constants/api/fetchPublicCatalog";
import {
  fetchCategoryCatalog,
  mergeCategoryRow,
  normalizeCategoryKey,
  type CategoryRow,
  type DisplayCategory,
} from "@/constants/catalog/categoriesCatalog";
import { Product } from "@/assets/types/product";
import { SearchSuggestion } from "@/components/common/SearchBar";

// ─── Side Menu Item ───────────────────────────────────────────────────────────

function MenuItem({
  icon, label, sublabel, onPress, danger,
}: {
  icon: string; label: string; sublabel?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={menu.item} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={[menu.iconWrap, danger && menu.iconWrapDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={menu.labelWrap}>
        <Text style={[menu.label, danger && menu.labelDanger]}>{label}</Text>
        {sublabel ? <Text style={menu.sublabel}>{sublabel}</Text> : null}
      </View>
      {onPress && !danger ? <Ionicons name="chevron-forward" size={14} color="#C8CDD6" /> : null}
    </TouchableOpacity>
  );
}

const menu = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12, borderTopWidth: 1, borderTopColor: "#F4F6F9" },
  iconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconWrapDanger: { backgroundColor: "#FEF2F2" },
  labelWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 1 },
  labelDanger: { color: colors.error },
  sublabel: { fontSize: 11, color: colors.textMuted, fontWeight: "500" },
});

type Store = { _id: string; name: string; address?: string; city?: string };

// Tab bar height constant — must match _layout.tsx
const TAB_BAR_HEIGHT = 60;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { logout, user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recommendedProductIds, setRecommendedProductIds] = useState<string[]>([]);
  const [recommendationMeta, setRecommendationMeta] = useState<{
    experimentId: string;
    variant: string;
  } | null>(null);
  const [flatCategories, setFlatCategories] = useState<CategoryRow[]>([]);
  const [parentCategories, setParentCategories] = useState<DisplayCategory[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);

  const slideAnim      = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [safeProducts, catalog, storesRes] = await Promise.all([
          fetchAllPublicProducts(axiosInstance),
          fetchCategoryCatalog(axiosInstance),
          axiosInstance.get("/api/stores/public"),
        ]);
        setAllProducts(safeProducts);
        setFlatCategories(catalog.flatAll);
        setParentCategories(catalog.mergedParents);
        setAllStores(storesRes.data?.data ?? []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!isAuthenticated) {
        setRecommendedProductIds([]);
        return;
      }
      try {
        const res = await axiosInstance.get("/api/recommendations?limit=12");
        const ids = Array.isArray(res.data?.data)
          ? (res.data.data as Array<{ _id?: string }>)
              .map((p) => String(p?._id ?? ""))
              .filter(Boolean)
          : [];
        setRecommendedProductIds(ids);
        setRecommendationMeta({
          experimentId: String(res.data?.experimentId ?? "reco_v1"),
          variant: String(res.data?.variant ?? "default"),
        });
        if (ids.length > 0) {
          void axiosInstance.post("/api/recommendations/impressions", {
            productIds: ids,
            placement: "home_recommended",
            experimentId: String(res.data?.experimentId ?? "reco_v1"),
            variant: String(res.data?.variant ?? "default"),
          });
        }
      } catch {
        setRecommendedProductIds([]);
        setRecommendationMeta(null);
      }
    };
    void loadRecommendations();
  }, [isAuthenticated]);

  useEffect(() => {
    navigation.setOptions({ tabBarStyle: selectedCategory ? { display: "none" } : undefined });
  }, [navigation, selectedCategory]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    allProducts.forEach((product) => {
      if (product.name.toLowerCase().includes(query)) {
        const catObj   = product.category;
        const catId    = typeof catObj === "object" && catObj?._id ? catObj._id : catObj as string;
        const category = flatCategories.find((c) => c._id === catId);
        suggestions.push({
          id: `product-${product._id}`,
          name: product.name,
          type: "product",
          imageUrl: Array.isArray(product.images) ? product.images[0] : undefined,
          categoryName: category?.name,
        });
      }
    });

    const seenCat = new Set<string>();
    flatCategories.forEach((category) => {
      if (!category.name.toLowerCase().includes(query)) return;
      const dedupeKey = `${String(category.parent ?? "")}:${normalizeCategoryKey(category)}`;
      if (seenCat.has(dedupeKey)) return;
      seenCat.add(dedupeKey);
      suggestions.push({ id: `category-${category._id}`, name: category.name, type: "category" });
    });

    allStores.forEach((store) => {
      if (store.name.toLowerCase().includes(query))
        suggestions.push({ id: `store-${store._id}`, name: store.name, type: "store" });
    });

    return suggestions.slice(0, 8);
  }, [searchQuery, allProducts, flatCategories, allStores]);

  const productsByStore = useMemo(() => {
    if (!selectedStore) return [];
    return allProducts.filter((p) =>
      (p.stockByStoreVariant ?? []).some((e) => String(e.store) === String(selectedStore._id))
    );
  }, [selectedStore, allProducts]);

  const recommendedProducts = useMemo(() => {
    if (recommendedProductIds.length === 0 || allProducts.length === 0) return [];
    const byId = new Map(allProducts.map((p) => [String(p._id), p]));
    return recommendedProductIds
      .map((id) => byId.get(String(id)))
      .filter((p): p is Product => Boolean(p));
  }, [recommendedProductIds, allProducts]);

  const trackRecommendationClick = useCallback(
    (productId: string) => {
      const experimentId = recommendationMeta?.experimentId ?? "reco_v1";
      const variant = recommendationMeta?.variant ?? "default";
      void axiosInstance.post("/api/recommendations/click", {
        productId,
        placement: "home_recommended",
        experimentId,
        variant,
      });
    },
    [recommendationMeta]
  );

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === "category") {
      const row = flatCategories.find((c) => c._id === suggestion.id.replace("category-", ""));
      if (row) { setSelectedCategory(mergeCategoryRow(row, flatCategories)); setSelectedStore(null); setSearchQuery(""); }
    } else if (suggestion.type === "store") {
      const store = allStores.find((s) => s._id === suggestion.id.replace("store-", ""));
      if (store) { setSelectedStore(store); setSearchQuery(""); }
    } else if (suggestion.type === "product") {
      const rawId = suggestion.id.startsWith("product-")
        ? suggestion.id.slice("product-".length)
        : suggestion.id;
      setSearchQuery("");
      router.push({ pathname: "/product/[id]", params: { id: rawId } });
    }
  }, [flatCategories, allStores]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 10);
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim,      { toValue: 0,   duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0.5, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim,      { toValue: width, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0,     duration: 260, useNativeDriver: true }),
    ]).start(() => setMenuOpen(false));
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const isLoggedIn = Boolean(isAuthenticated && user?.email);

  // Extra bottom padding so content doesn't hide behind the fixed tab bar
  const bottomPad = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F6F9" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1923" translucent={false} />

      {/* ── Header (same right-circle accent as promo box) ── */}
      <View style={[s.header, scrolled && s.headerScrolled, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerBlob} />
        <View style={s.headerContent}>
          <View style={s.logoWrap}>
            <Image source={require("@/assets/images/dhukanamTrans.png")} style={s.logoImage} resizeMode="contain" />
          </View>
          <View style={s.rightIcons}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.push("/(tabs)/wishlist")}>
              <Ionicons name="heart-outline" size={20} color="rgba(255,255,255,0.85)" />
              <WishlistBadge />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.push("/(tabs)/cart")}>
              <Ionicons name="cart-outline" size={20} color="rgba(255,255,255,0.85)" />
              <CartBadge />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuBtn} onPress={openMenu} activeOpacity={0.7}>
              <Ionicons name="menu" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Main Content ── */}
      {selectedCategory ? (
        <CategoryProducts
          selectedCategory={selectedCategory}
          flatCategories={flatCategories}
          onBack={() => { setSelectedCategory(null); setSearchQuery(""); }}
        />
      ) : selectedStore ? (
        <View style={{ flex: 1 }}>
          <View style={[s.storeHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => { setSelectedStore(null); setSearchQuery(""); }} style={s.storeBackBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.storeHeaderTitle} numberOfLines={1}>{selectedStore.name}</Text>
              {selectedStore.address ? <Text style={s.storeHeaderSub} numberOfLines={1}>{selectedStore.address}</Text> : null}
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
              <SectionHeader title={`Products at ${selectedStore.name}`} />
            </View>
            {productsByStore.length > 0 ? (
              <ProductGrid products={productsByStore} categories={flatCategories} responsive />
            ) : (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="basket-outline" size={36} color={colors.primary} />
                </View>
                <Text style={s.emptyTitle}>No products here</Text>
                <Text style={s.emptyText}>This store has no products available right now.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        // ── HOME: NO KeyboardAvoidingView — it causes tab bar to shrink ──
        <View style={{ flex: 1 }}>
          <SearchBar
            onQueryChange={setSearchQuery}
            suggestions={searchSuggestions}
            onSuggestionSelect={handleSuggestionSelect}
            showSuggestions={true}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            // Extra bottom padding for fixed tab bar + safe area
            contentContainerStyle={{ paddingBottom: bottomPad }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
          >
            <CategoriesList categories={parentCategories} onSelectCategory={setSelectedCategory} loading={loading} />
            <BannerSlider />
            <DealOfTheDay />

            {recommendedProducts.length > 0 ? (
              <>
                <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
                  <SectionHeader title="Recommended For You" />
                  <Text style={s.catalogSub}>
                    Personalized picks based on your activity
                    {recommendationMeta
                      ? ` · ${recommendationMeta.experimentId}/${recommendationMeta.variant}`
                      : ""}
                  </Text>
                </View>
                <ProductGrid
                  products={recommendedProducts}
                  categories={flatCategories}
                  responsive
                  onProductPress={trackRecommendationClick}
                />
              </>
            ) : null}

            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
              <SectionHeader title="All Products" />
              <Text style={s.catalogSub}>
                {loading && allProducts.length === 0
                  ? "Loading catalog…"
                  : `${allProducts.length} product${allProducts.length === 1 ? "" : "s"} · prices, offers & availability`}
              </Text>
            </View>
            {loading && allProducts.length === 0 ? (
              <Loader variant="inline" message="Loading products…" />
            ) : (
              <ProductGrid products={allProducts} categories={flatCategories} responsive />
            )}

            <View style={s.promoBox}>
              <View style={s.promoBlob} />
              <View style={s.promoContent}>
                <View style={s.promoBadge}>
                  <Ionicons name="leaf-outline" size={11} color={colors.primaryLight} />
                  <Text style={s.promoBadgeText}>100% Natural</Text>
                </View>
                <Text style={s.promoTitle}>Discover The Best{"\n"}Fruit Products</Text>
                <Text style={s.promoSubtitle}>
                  Freshly Procured · Hygienically Prepared · Quickly Delivered
                </Text>
                <View style={s.promoTags}>
                  {["🌿 Farm Fresh", "⚡ Fast Delivery", "✓ Certified"].map((t) => (
                    <View key={t} style={s.promoTag}>
                      <Text style={s.promoTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Side Menu ── */}
      {menuOpen && (
        <>
          <Pressable style={[StyleSheet.absoluteFill, s.overlayWrap]} onPress={closeMenu}>
            <Animated.View style={[s.overlay, { opacity: overlayOpacity }]} />
          </Pressable>
          <Animated.View style={[s.sideMenu, { width: width * 0.74, transform: [{ translateX: slideAnim }] }]}>
            <View style={[s.menuHeader, { paddingTop: insets.top + 14 }]}>
              <View style={s.menuHeaderRow}>
                <View style={s.menuAvatar}>
                  <Text style={s.menuAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuUserName} numberOfLines={1}>{user?.name || "Welcome!"}</Text>
                  <Text style={s.menuUserEmail} numberOfLines={1}>{user?.email || "KTL Member"}</Text>
                </View>
                <TouchableOpacity onPress={closeMenu} style={s.menuCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={s.menuBody} contentContainerStyle={s.menuBodyContent} showsVerticalScrollIndicator={false}>
              <Text style={s.menuSectionLabel}>Shop</Text>
              <View style={s.menuSection}>
                <MenuItem icon="grid-outline" label="Products" sublabel="Browse full catalogue" onPress={() => { closeMenu(); router.push("/(tabs)/products" as any); }} />
                <MenuItem icon="receipt-outline" label="Orders" sublabel="Track your purchases" onPress={() => { closeMenu(); router.push("/orders" as any); }} />
                <MenuItem icon="heart-outline" label="Wishlist" sublabel="Your saved items" onPress={() => { closeMenu(); router.push("/(tabs)/wishlist" as any); }} />
              </View>
              <Text style={s.menuSectionLabel}>Account</Text>
              <View style={s.menuSection}>
                <MenuItem icon="person-outline" label="Profile" sublabel="Manage your account" onPress={() => { closeMenu(); router.push("/(tabs)/profile" as any); }} />
                <MenuItem icon="notifications-outline" label="Notifications" sublabel="Alerts & updates" />
              </View>
              <View style={s.menuSection}>
                {isLoggedIn ? (
                  <MenuItem
                    icon="log-out-outline" label="Logout" danger
                    onPress={async () => {
                      closeMenu();
                      try { await logout(); setTimeout(() => router.replace("/(auth)/login" as any), 50); }
                      catch { router.replace("/(auth)/login" as any); }
                    }}
                  />
                ) : (
                  <MenuItem icon="log-in-outline" label="Sign In" sublabel="Login to your account" onPress={() => { closeMenu(); router.push("/(auth)/login" as any); }} />
                )}
              </View>
            </ScrollView>
            <View style={s.menuFooter}>
              <Ionicons name="leaf" size={12} color={colors.primary} />
              <Text style={s.menuFooterText}>KTL Fresh · v1.0.0</Text>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: "#0F1923",
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    opacity: 0.35,
    top: -55,
    right: -35,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  headerScrolled: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  logoWrap: { height: 40, overflow: "visible", justifyContent: "center" },
  logoImage: { width: 130, height: 70, resizeMode: "contain", marginVertical: -7, marginLeft: -20, marginTop: 5 },
  rightIcons: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginLeft: 2,
  },
  storeHeader: {
    backgroundColor: "#0F1923", paddingHorizontal: SCREEN_PADDING, paddingBottom: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  storeBackBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  storeHeaderTitle: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: -0.2, marginBottom: 2 },
  storeHeaderSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  catalogSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 4, fontWeight: "500" },
  emptyState: { alignItems: "center", marginTop: 60, gap: 10, paddingHorizontal: SCREEN_PADDING },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  promoBox: { margin: SCREEN_PADDING, borderRadius: 20, backgroundColor: "#0F1923", overflow: "hidden", minHeight: 160 },
  promoBlob: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primary, opacity: 0.35, top: -60, right: -40 },
  promoContent: { padding: 22 },
  promoBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  promoBadgeText: { fontSize: 10, fontWeight: "700", color: colors.primaryLight, letterSpacing: 0.5 },
  promoTitle: { fontSize: 22, fontWeight: "900", color: "#fff", lineHeight: 28, letterSpacing: -0.3, marginBottom: 8 },
  promoSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 16, marginBottom: 14 },
  promoTags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  promoTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  promoTagText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  overlayWrap: { zIndex: 9998, elevation: 9998 },
  overlay: { flex: 1, backgroundColor: "#000" },
  sideMenu: { position: "absolute", top: 0, right: 0, height: "100%", backgroundColor: "#fff", zIndex: 9999, elevation: 9999, shadowColor: "#000", shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.12, shadowRadius: 16 },
  menuHeader: { backgroundColor: "#0F1923", paddingHorizontal: 18, paddingBottom: 20 },
  menuHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4, flexShrink: 0 },
  menuAvatarText: { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  menuUserName: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2, marginBottom: 2 },
  menuUserEmail: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  menuCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuBody: { flex: 1 },
  menuBodyContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20, gap: 4 },
  menuSectionLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 10, marginBottom: 4, paddingLeft: 2 },
  menuSection: { backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#EAEDF2", marginBottom: 4 },
  menuFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingBottom: 28, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F4F6F9" },
  menuFooterText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
})