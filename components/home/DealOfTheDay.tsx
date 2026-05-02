// components/home/DealOfTheDay.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import axiosInstance from "@/constants/api/axiosInstance";
import { Product } from "@/assets/types/product";
import { SCREEN_PADDING } from "@/constants/layout";
import { colors } from "@/constants/colors";
import { parseImageUri } from "@/utils/imageUri";

type DealProduct = Product & { dealDiscountPercent?: number };

function withTax(price: number, taxRate?: number | null): number {
  if (!taxRate || taxRate <= 0) return price;
  return price * (1 + taxRate / 100);
}

function variantLabel(v: { value: number; unit: string }): string {
  return `${v.value} ${v.unit}`;
}

function DealCard({ item, cardWidth }: { item: DealProduct; cardWidth: number }) {
  const router = useRouter();
  const v = item.variants?.[0];
  const isFixed = item.pricingMode === "fixed";
  const basePrice = isFixed && v ? (v.offerPrice ?? v.price) : (item.pricePerUnit ?? 0);
  const discountPercent = item.dealDiscountPercent ?? 5;
  const displayPrice = withTax(basePrice * (1 - discountPercent / 100), item.taxRate);
  const origPrice = withTax(basePrice, item.taxRate);
  const dealImgUri = parseImageUri(item.images?.[0]);

  return (
    <TouchableOpacity
      style={[s.card, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: "/product/[id]", params: { id: item._id } })}
    >
      <View style={s.imgBox}>
        {dealImgUri ? (
          <Image source={{ uri: dealImgUri }} style={s.img} resizeMode="cover" />
        ) : (
          <View style={[s.img, s.imgPlaceholder]}>
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={s.badge}>
          <Text style={s.badgeT}>{discountPercent}% OFF</Text>
        </View>
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>
        {v ? (
          <Text style={s.size}>{variantLabel(v)}</Text>
        ) : (
          <Text style={s.size}>Per {item.baseUnit ?? "pcs"}</Text>
        )}
        <View style={s.priceRow}>
          <Text style={s.orig}>₹{origPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
          <Text style={s.price}>₹{displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DealOfTheDay() {
  const { width } = useWindowDimensions();
  const cardW = width * 0.42;
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await axiosInstance.get<{ data: DealProduct[] }>("/api/products/deal-of-the-day");
        const data = res.data?.data ?? [];
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  if (loading) {
    return (
      <View style={s.section}>
        <View style={s.header}>
          <View style={s.bar} />
          <Text style={s.title}>Deal of the Day</Text>
        </View>
        <View style={s.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.loadingText}>Loading deals...</Text>
        </View>
      </View>
    );
  }

  if (products.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.header}>
        <View style={s.bar} />
        <Text style={s.title}>Deal of the Day</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
      >
        {products.map((p) => (
          <DealCard key={p._id} item={p} cardWidth={cardW} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    marginTop: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: 16,
    gap: 8,
  },
  bar: {
    width: 4,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    gap: 12,
    flexDirection: "row",
  },
  card: {
    minWidth: 120,
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
  imgPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
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
  badgeT: {
    color: colors.card,
    fontSize: 9,
    fontWeight: "800",
  },
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
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  orig: {
    fontSize: 10,
    color: colors.disabled,
    textDecorationLine: "line-through",
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
