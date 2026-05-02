// components/home/CategoryItem.tsx
import { View, Text, StyleSheet, TouchableOpacity, Image, type ImageSourcePropType } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  title: string;
  image: ImageSourcePropType;
  onPress?: () => void;
};

export default function CategoryItem({
  title,
  image,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={s.container} onPress={onPress} activeOpacity={0.75}>
      <View style={s.imageWrap}>
        <Image source={image} style={s.image} resizeMode="cover" />
      </View>
      <Text style={s.label} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  imageWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 68,
  },
});