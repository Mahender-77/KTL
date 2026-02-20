// components/home/CategoryItem.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export default function CategoryItem({ title, icon, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginRight: 15,
  },
  iconWrapper: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 15,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});