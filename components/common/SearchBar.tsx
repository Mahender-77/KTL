import { View, TextInput, StyleSheet, TouchableOpacity, FlatList, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { colors } from "@/constants/colors";

export type SearchSuggestion = {
  id: string;
  name: string;
  type: "product" | "category" | "store";
  categoryName?: string;
  storeName?: string;
};

type Props = {
  onSearchChange?: (query: string) => void;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
};

export default function SearchBar({ 
  onSearchChange, 
  suggestions = [], 
  onSuggestionSelect,
  showSuggestions = true 
}: Props) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  const lastFocusTime = useRef<number>(0);
  const refocusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for debouncing
    debounceTimer.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(query);
      }
    }, 300); // 300ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearchChange]);

  const handleClear = () => {
    setQuery("");
    if (onSearchChange) {
      onSearchChange("");
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.name);
    setIsFocused(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    if (onSearchChange) {
      onSearchChange(suggestion.name);
    }
  };

  const displaySuggestions = showSuggestions && isFocused && query.length > 0 && suggestions.length > 0;

  // Android: keyboard often triggers a spurious blur when window pans/resizes. Refocus if blur happens soon after focus.
  const handleFocus = () => {
    lastFocusTime.current = Date.now();
    setIsFocused(true);
  };

  const handleBlur = () => {
    const timeSinceFocus = Date.now() - lastFocusTime.current;
    const isLikelySpuriousBlur = Platform.OS === "android" && timeSinceFocus < 800;
    if (isLikelySpuriousBlur) {
      refocusTimeout.current = setTimeout(() => {
        inputRef.current?.focus();
        refocusTimeout.current = null;
      }, 50);
      return;
    }
    setTimeout(() => setIsFocused(false), 200);
  };

  useEffect(() => () => {
    if (refocusTimeout.current) clearTimeout(refocusTimeout.current);
  }, []);

  return (
    <View style={styles.wrapper} collapsable={false}>
      <View style={[styles.container, isFocused && styles.containerFocused]} collapsable={false}>
        <Ionicons name="search-outline" size={20} color={isFocused ? colors.primary : "#999"} />
        <TextInput
          ref={inputRef}
          placeholder="Search products, categories, or stores..."
          style={styles.input}
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={true}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          blurOnSubmit={false}
          keyboardType="default"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {displaySuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions.slice(0, 8)} // Limit to 8 suggestions
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    item.type === "product"
                      ? "cube-outline"
                      : item.type === "store"
                      ? "storefront-outline"
                      : "grid-outline"
                  }
                  size={18}
                  color={colors.primary}
                />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  {item.type === "product" && item.categoryName && (
                    <Text style={styles.suggestionCategory}>{item.categoryName}</Text>
                  )}
                  {item.type === "store" && item.storeName && (
                    <Text style={styles.suggestionCategory}>{item.storeName}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.disabled} />
              </TouchableOpacity>
            )}
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 10,
    backgroundColor: "transparent", // Ensure transparent background doesn't block
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    marginVertical: 15,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  containerFocused: {
    backgroundColor: "#fff",
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0, // Remove default padding that might interfere
    minHeight: 20, // Ensure minimum height for touch target
  },
  suggestionsContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
