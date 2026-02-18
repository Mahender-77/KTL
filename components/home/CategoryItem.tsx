import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export default function CategoryItem({ title, icon, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={24} color="#FF6B00" />
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
    backgroundColor: "#FFF3E8",
    padding: 15,
    borderRadius: 15,
    marginBottom: 5,
  },
  text: {
    fontSize: 12,
  },
});
