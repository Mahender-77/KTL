// app/HomeScreen.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
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

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 10);
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: width, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMenuOpen(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* ── Header ── */}
      <View style={[styles.headerContainer, scrolled && styles.headerShadow]}>
        <View style={styles.header}>
          <Text style={styles.logo}>KTL</Text>
          <View style={styles.rightIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="heart-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="cart-outline" size={24} color="#000" />
              <CartBadge count={3} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
              <Ionicons name="menu" size={28} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <SearchBar />

        {selectedCategory ? (
          // ── Category view ──
          // ✅ No padding here — CategoryProducts owns its own layout including breadcrumb
          <CategoryProducts
            selectedCategory={selectedCategory}
            onBack={() => setSelectedCategory(null)}
          />
        ) : (
          // ── Home view ──
          <>
            <CategoriesList onSelectCategory={setSelectedCategory} />
            <BannerSlider />

            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: 16 }}>
              <SectionHeader title="🔥 Featured Products" />
            </View>
            <ProductGrid products={[]} />

            <View style={styles.promoBox}>
              <Text style={styles.promoTitle}>Discover The Best Fruit Products</Text>
              <Text style={styles.promoSubtitle}>
                Freshly Procured, Hygienically Prepared & Quickly Delivered
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Overlay ── */}
      {menuOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </Pressable>
      )}

      {/* ── Side Menu ── */}
      <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={closeMenu}>
          <Ionicons name="close" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.menuItem}>Home</Text>
        <Text style={styles.menuItem}>Products</Text>
        <Text style={styles.menuItem}>Cart</Text>
        <Text style={styles.menuItem}>Profile</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: SCREEN_PADDING,
    backgroundColor: "#fff",
  },
  headerShadow: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  logo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FF6B00",
    letterSpacing: 1,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    marginLeft: 16,
  },
  promoBox: {
    margin: SCREEN_PADDING,
    padding: 20,
    backgroundColor: "#FFF3E8",
    borderRadius: 15,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FF6B00",
  },
  promoSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  sideMenu: {
    position: "absolute",
    top: 0,
    right: 0,
    width: width * 0.7,
    height: "100%",
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 10,
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  menuItem: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1A1A2E",
    marginVertical: 14,
  },
});