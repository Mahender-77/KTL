import {
  FlatList,
  Image,
  Dimensions,
  View,
  StyleSheet,
} from "react-native";
import { useEffect, useRef, useState } from "react";

const { width } = Dimensions.get("window");

export default function BannerSlider() {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.image }} style={styles.banner} />
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / (width - 40)
          );
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
    width: width - 40,
    height: 160,
    borderRadius: 15,
    marginHorizontal: 20,
  },
});
