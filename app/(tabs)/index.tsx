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
import CategoryProducts from "@/components/CategoryProducts";
import ProductGrid from "@/components/product/ProductGrid";
import SectionHeader from "@/components/common/SectionHeader";
import { SCREEN_PADDING } from "@/constants/layout";
import { useState, useRef } from "react";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

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
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons
                name="heart-outline"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
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
          onBack={() => setSelectedCategory(null)}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <SearchBar />
          <CategoriesList onSelectCategory={setSelectedCategory} />
          <BannerSlider />

          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
            <SectionHeader title="🔥 Featured Products" />
          </View>
          <ProductGrid products={[]} />

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
});
