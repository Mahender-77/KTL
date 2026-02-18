import { View, Text, StyleSheet } from "react-native";

type Props = {
  count: number;
};

export default function CartBadge({ count }: Props) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
