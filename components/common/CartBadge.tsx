// components/common/CartBadge.tsx

import { colors } from "@/constants/colors";
import { useCart } from "@/context/CartContext";
import { View, Text, StyleSheet } from "react-native";

export default function CartBadge() {
  const { totalItems } = useCart();
  const count = Math.floor(Number(totalItems) || 0);

  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -3,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
