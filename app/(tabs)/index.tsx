// app/(tabs)/index.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "@/components/common/SearchBar";
import CategoriesList from "@/components/home/CategoriesList";
import BannerSlider from "@/components/home/BannerSlider";
import CartBadge from "@/components/common/CartBadge";
import WishlistBadge from "@/components/common/WishlistBadge";
import CategoryProducts from "@/components/CategoryProducts";
import ProductGrid from "@/components/product/ProductGrid";
import SectionHeader from "@/components/common/SectionHeader";
import { SCREEN_PADDING } from "@/constants/layout";
import { useState, useRef, useEffect, useMemo } from "react";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import { SearchSuggestion } from "@/components/common/SearchBar";

const { width } = Dimensions.get("window");

// ─── Side Menu Item ───────────────────────────────────────────────────────────
function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={menu.item} onPress={onPress} activeOpacity={0.7}>
      <View style={menu.iconWrap}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <Text style={menu.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.disabled} />
    </TouchableOpacity>
  );
}

const menu = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});

type Category = {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  children?: Category[];
};

type Store = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
};


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch products, categories, and stores on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes, storesRes] = await Promise.all([
          axiosInstance.get("/api/products/public"),
          axiosInstance.get("/api/categories"),
          axiosInstance.get("/api/stores"),
        ]);
        
        setAllProducts(productsRes.data || []);
        // Flatten categories to include all (parent and children)
        const categories = categoriesRes.data || [];
        const flatCategories: Category[] = [];
        const flatten = (cats: Category[]) => {
          cats.forEach((cat) => {
            flatCategories.push(cat);
            if (cat.children && Array.isArray(cat.children)) {
              flatten(cat.children);
            }
          });
        };
        flatten(categories);
        setAllCategories(flatCategories);
        setAllStores(storesRes.data || []);
      } catch (error) {
        console.log("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    // Search products
    allProducts.forEach((product) => {
      if (product.name.toLowerCase().includes(query)) {
        const category = allCategories.find(
          (cat) => cat._id === (product.category as any)?._id || cat._id === product.category
        );
        suggestions.push({
          id: `product-${product._id}`,
          name: product.name,
          type: "product",
          categoryName: category?.name,
        });
      }
    });

    // Search categories
    allCategories.forEach((category) => {
      if (category.name.toLowerCase().includes(query)) {
        suggestions.push({
          id: `category-${category._id}`,
          name: category.name,
          type: "category",
        });
      }
    });

    // Search stores
    allStores.forEach((store) => {
      if (store.name.toLowerCase().includes(query)) {
        suggestions.push({
          id: `store-${store._id}`,
          name: store.name,
          type: "store",
        });
      }
    });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [searchQuery, allProducts, allCategories, allStores]);

  // Filter products, categories, and stores based on search
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return { products: [], categories: [], stores: [] };

    const query = searchQuery.toLowerCase().trim();
    const filteredProducts = allProducts.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
    const filteredCategories = allCategories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
    const filteredStores = allStores.filter((store) =>
      store.name.toLowerCase().includes(query)
    );

    return { products: filteredProducts, categories: filteredCategories, stores: filteredStores };
  }, [searchQuery, allProducts, allCategories, allStores]);

  // Filter products by selected store
  const productsByStore = useMemo(() => {
    if (!selectedStore) return [];
    
    return allProducts.filter((product) => {
      // Check if product has inventory in the selected store
      const inventory = (product as any).inventory || [];
      return inventory.some((inv: any) => {
        const store = inv.store;
        if (typeof store === 'object' && store?._id) {
          return store._id === selectedStore._id;
        }
        return store === selectedStore._id;
      });
    });
  }, [selectedStore, allProducts]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "category") {
      const category = allCategories.find((cat) => cat._id === suggestion.id.replace("category-", ""));
      if (category) {
        setSelectedCategory(category);
        setSearchQuery("");
      }
    } else if (suggestion.type === "store") {
      const store = allStores.find((s) => s._id === suggestion.id.replace("store-", ""));
      if (store) {
        setSelectedStore(store);
        setSearchQuery("");
      }
    } else {
      // For products, just keep the search query
      setSearchQuery(suggestion.name);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 10);
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setMenuOpen(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
        translucent={false}
      />

      {/* ── Header ── */}
      <View style={[styles.headerContainer, scrolled && styles.headerShadow]}>
        {/* Decorative blobs */}
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={styles.header}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoIconBox}>
              <Ionicons name="leaf" size={16} color={colors.card} />
            </View>
            <Text style={styles.logoText}>KTL</Text>
          </View>

          {/* Right icons */}
          <View style={styles.rightIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/wishlist")}
            >
              <Ionicons
                name="heart-outline"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
              <WishlistBadge />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
              <CartBadge />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.menuBtn]}
              onPress={openMenu}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Main Content ── */}
      {selectedCategory ? (
        <CategoryProducts
          selectedCategory={selectedCategory}
          onBack={() => {
            setSelectedCategory(null);
            setSearchQuery("");
          }}
        />
      ) : selectedStore ? (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Store Header */}
          <View style={styles.storeHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedStore(null);
                setSearchQuery("");
              }}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.storeHeaderContent}>
              <Ionicons name="storefront" size={24} color={colors.primary} />
              <Text style={styles.storeHeaderTitle}>{selectedStore.name}</Text>
            </View>
            {selectedStore.address && (
              <Text style={styles.storeAddress}>{selectedStore.address}</Text>
            )}
          </View>

          {/* Products from this store */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
              <SectionHeader title={`Products at ${selectedStore.name}`} />
            </View>
            {productsByStore.length > 0 ? (
              <ProductGrid products={productsByStore} />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="basket-outline" size={48} color={colors.disabled} />
                <Text style={styles.emptyText}>No products available at this store</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <SearchBar
            onSearchChange={handleSearchChange}
            suggestions={searchSuggestions}
            onSuggestionSelect={handleSuggestionSelect}
            showSuggestions={true}
          />

          {/* Search Results */}
          {searchQuery.length >= 2 ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING }}>
              <Text style={styles.searchResultsTitle}>
                Search Results for "{searchQuery}"
              </Text>
              
              {searchResults.categories.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <SectionHeader title="Categories" />
                  <View style={styles.categoryResults}>
                    {searchResults.categories.map((category) => (
                      <TouchableOpacity
                        key={category._id}
                        style={styles.categoryResultItem}
                        onPress={() => {
                          setSelectedCategory(category);
                          setSearchQuery("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="grid-outline" size={20} color={colors.primary} />
                        <Text style={styles.categoryResultText}>{category.name}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.disabled} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {searchResults.stores.length > 0 && (
                <View style={{ marginTop: searchResults.categories.length > 0 ? 24 : 16 }}>
                  <SectionHeader title="Stores" />
                  <View style={styles.categoryResults}>
                    {searchResults.stores.map((store) => (
                      <TouchableOpacity
                        key={store._id}
                        style={styles.categoryResultItem}
                        onPress={() => {
                          setSelectedStore(store);
                          setSearchQuery("");
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.categoryResultText}>{store.name}</Text>
                          {store.address && (
                            <Text style={styles.storeResultAddress}>{store.address}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.disabled} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {searchResults.products.length > 0 && (
                <View style={{ marginTop: (searchResults.categories.length > 0 || searchResults.stores.length > 0) ? 24 : 16 }}>
                  <SectionHeader title="Products" />
                </View>
              )}
            </View>
          ) : null}

          {searchQuery.length >= 2 ? (
            <ProductGrid products={searchResults.products} />
          ) : (
            <>
              <CategoriesList onSelectCategory={setSelectedCategory} />
              <BannerSlider />

              <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
                <SectionHeader title="🔥 Featured Products" />
              </View>
              <ProductGrid products={allProducts.slice(0, 10)} />
            </>
          )}

          {/* Promo box */}
          <View style={styles.promoBox}>
            <View style={styles.promoBlob} />
            <View style={styles.promoContent}>
              <View style={styles.promoBadge}>
                <Ionicons
                  name="leaf-outline"
                  size={11}
                  color={colors.primaryLight}
                />
                <Text style={styles.promoBadgeText}>100% Natural</Text>
              </View>
              <Text style={styles.promoTitle}>
                Discover The Best{"\n"}Fruit Products
              </Text>
              <Text style={styles.promoSubtitle}>
                Freshly Procured · Hygienically Prepared · Quickly Delivered
              </Text>
              <View style={styles.promoTags}>
                {["🌿 Farm Fresh", "⚡ Fast Delivery", "✓ Certified"].map(
                  (t) => (
                    <View key={t} style={styles.promoTag}>
                      <Text style={styles.promoTagText}>{t}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Overlay + Side Menu — only mounted when open ── */}
      {menuOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.sideMenu,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Menu header */}
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderBlob} />
              <View style={styles.menuUserRow}>
                <View style={styles.menuAvatar}>
                  <Ionicons name="person" size={26} color={colors.card} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuUserName}>
                    {user?.name || "Welcome!"}
                  </Text>
                  <Text style={styles.menuUserSub}>
                    {user?.email || "KTL Member"}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.card} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu items */}
            <View style={styles.menuBody}>
              <MenuItem icon="grid-outline" label="Products" />
              <MenuItem
                icon="receipt-outline"
                label="Orders"
                onPress={() => {
                  closeMenu();
                  router.push("/orders" as any);
                }}
              />
              <MenuItem icon="person-outline" label="Profile" />
              <MenuItem icon="notifications-outline" label="Notifications" />

              {/* Logout */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={async () => {
                  closeMenu();
                  try {
                    await logout();
                    // Use setTimeout to ensure state updates before navigation
                    setTimeout(() => {
                      router.replace("/(auth)/login" as any);
                    }, 50);
                  } catch (error) {
                    console.log("Logout error:", error);
                    // Still navigate even if logout fails
                    router.replace("/(auth)/login" as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.error}
                />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.menuFooter}>KTL Fresh · v1.0.0</Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Header ──
  headerContainer: {
    paddingTop: 10,
    paddingHorizontal: SCREEN_PADDING,
    backgroundColor: colors.primaryDark,
    overflow: "hidden",
    position: "relative",
  },
  headerShadow: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginLeft: 4,
  },
  headerBlob1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    opacity: 0.35,
    top: -40,
    right: 60,
  },
  headerBlob2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    opacity: 0.2,
    top: -20,
    right: -10,
  },

  // ── Promo Box ──
  promoBox: {
    margin: SCREEN_PADDING,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    overflow: "hidden",
    minHeight: 160,
  },
  promoBlob: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.35,
    top: -60,
    right: -40,
  },
  promoContent: { padding: 22 },
  promoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 16,
    marginBottom: 14,
  },
  promoTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  promoTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  promoTagText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },

  // ── Overlay ──
  overlay: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── Side Menu ──
  sideMenu: {
    position: "absolute",
    top: 0,
    right: 0,
    width: width * 0.72,
    height: "100%",
    backgroundColor: colors.card,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuHeader: {
    backgroundColor: colors.primaryDark,
    paddingTop: 55,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: "hidden",
    position: "relative",
  },
  menuHeaderBlob: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    opacity: 0.3,
    top: -40,
    right: -30,
  },
  menuUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  menuUserName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
  },
  menuUserSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
    fontWeight: "500",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.error,
  },
  menuFooter: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    paddingBottom: 30,
    fontWeight: "500",
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryResults: {
    marginTop: 12,
    gap: 8,
  },
  categoryResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  categoryResultText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  storeResultAddress: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  storeHeader: {
    backgroundColor: colors.card,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    marginBottom: 12,
  },
  storeHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  storeHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  storeAddress: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 36,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
    paddingHorizontal: SCREEN_PADDING,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
