import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Props = {
  title: string;
  onPress?: () => void;
};

export default function SectionHeader({ title, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  seeAll: {
    color: "#FF6B00",
    fontSize: 14,
  },
});
