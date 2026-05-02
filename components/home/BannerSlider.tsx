// components/home/BannerSlider.tsx
import {
  FlatList,
  Image,
  useWindowDimensions,
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { SCREEN_PADDING } from "@/constants/layout";
import { parseImageUri } from "@/utils/imageUri";

const banners = [
  { id: "1", image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092" },
  { id: "2", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c" },
  { id: "3", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061" },
];

export default function BannerSlider() {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const bannerWidth  = width - SCREEN_PADDING * 2;
  const bannerHeight = Math.max(130, Math.min(170, bannerWidth * 0.48));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = currentIndex === banners.length - 1 ? 0 : currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }, 3500);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={s.wrapper}>
      <FlatList
        key={`${bannerWidth}-${bannerHeight}`}
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const uri = parseImageUri(item.image);
          return (
            <View style={{ width }}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={[s.banner, { width: bannerWidth, height: bannerHeight, marginHorizontal: SCREEN_PADDING }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[s.banner, s.bannerFallback, { width: bannerWidth, height: bannerHeight, marginHorizontal: SCREEN_PADDING }]} />
              )}
            </View>
          );
        }}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Dot indicators */}
      <View style={s.dots}>
        {banners.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dot, i === currentIndex && s.dotActive]}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index: i, animated: true });
              setCurrentIndex(i);
            }}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginVertical: 14,
  },
  banner: {
    borderRadius: 16,
  },
  bannerFallback: {
    backgroundColor: "#E8ECF0",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
});