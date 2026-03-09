import {
  FlatList,
  Image,
  useWindowDimensions,
  View,
  StyleSheet,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { SCREEN_PADDING } from "@/constants/layout";

export default function BannerSlider() {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const bannerWidth = width - SCREEN_PADDING * 2;
  const bannerHeight = Math.max(140, Math.min(180, bannerWidth * 0.5));

  const banners = [
    {
      id: "1",
      image:
        "https://images.unsplash.com/photo-1600891964599-f61ba0e24092",
    },
    {
      id: "2",
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    },
    {
      id: "3",
      image:
        "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
    },
  ];

  // 🔥 Auto Slide
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex =
        currentIndex === banners.length - 1 ? 0 : currentIndex + 1;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });

      setCurrentIndex(nextIndex);
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <View style={styles.wrapper}>
      <FlatList
        key={`${bannerWidth}-${bannerHeight}`}
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <Image source={{ uri: item.image }} style={[styles.banner, { width: bannerWidth, height: bannerHeight, marginHorizontal: SCREEN_PADDING }]} />
          </View>
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 15,
  },
  banner: {
    borderRadius: 15,
  },
});
