import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar() {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color="#999" />
      <TextInput
        placeholder="Search products..."
        style={styles.input}
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
 container: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#f2f2f2",
  borderRadius: 12,
  paddingHorizontal: 15,
  height: 45,
  marginVertical: 15,
  marginHorizontal: 20, // <-- controls width spacing
},
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
});
