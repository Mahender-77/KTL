// app/product/[id].tsx
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import ProductDetailScreen from "@/components/product/Productdetailscreen";
// ✅ Match EXACT filename casing on disk


export default function ProductDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProduct(id);
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(false);

      const res = await axiosInstance.get(`/api/products/public/${productId}`);
      const fetched: Product = res.data;
      setProduct(fetched);

      try {
        const simRes = await axiosInstance.get(
          `/api/products/public?category=${fetched.category}&limit=10`
        );
        setSimilarProducts(
          (simRes.data as Product[]).filter((p) => p._id !== productId)
        );
      } catch {
        setSimilarProducts([]);
      }
    } catch (err) {
      console.log("Product fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Always render Stack.Screen to hide Expo Router's default header
  // Without this, the header pushes the screen down and blocks scroll
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      )}

      {!loading && (error || !product) && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      )}

      {!loading && product && (
        <ProductDetailScreen
          product={product}
          similarProducts={similarProducts}
          onBack={() => router.back()}
          onAddToCart={(p, variant, qty) => {
            console.log("Add to cart:", p.name, variant, qty);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2EFE9",
  },
  errorText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
});