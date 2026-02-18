// components/home/HomeShowcase.tsx
import { View, Text, StyleSheet } from "react-native";
import BannerSlider from "./BannerSlider";
import SectionHeader from "@/components/common/SectionHeader";
import ProductGrid from "@/components/product/ProductGrid";
import { Product } from "@/assets/types/product"; // ✅ same import as ProductGrid

type Props = {
  featuredProducts: Product[];
  newArrivals: Product[];
};

export default function HomeShowcase({ featuredProducts, newArrivals }: Props) {
  return (
    <View style={styles.container}>
      {/* 🔥 Hero Banner */}
      <BannerSlider />

      {/* 🎯 Featured Section */}
      <View style={styles.section}>
        <SectionHeader title="🔥 Featured Products" />
        <ProductGrid products={featuredProducts} />
      </View>

      {/* 🆕 New Arrivals */}
      <View style={styles.section}>
        <SectionHeader title="🆕 New Arrivals" />
        <ProductGrid products={newArrivals} />
      </View>

      {/* 💡 Platform Promotion */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>Discover The Best Fruit Products</Text>
        <Text style={styles.subtitle}>
          Freshly Procured, Hygienically Prepared & Quickly Delivered
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  infoBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#FFF3E8",
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B00",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
});