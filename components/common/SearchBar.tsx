// components/common/SearchBar.tsx
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
  Platform,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { resolvePublicMediaUri } from "@/utils/imageUri";

export type SearchSuggestion = {
  id: string;
  name: string;
  type: "product" | "category" | "store";
  /** Product cover image (raw path/URL from API) — only used when type is "product" */
  imageUrl?: string;
  categoryName?: string;
  storeName?: string;
};

type Props = {
  /** Debounced (300ms) — optional; use {@link onQueryChange} when parent must react on every keystroke (e.g. suggestions). */
  onSearchChange?: (query: string) => void;
  /** Fires on every keystroke so parent suggestion lists stay in sync with the input. */
  onQueryChange?: (query: string) => void;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
};

function typeIcon(type: SearchSuggestion["type"]): keyof typeof Ionicons.glyphMap {
  if (type === "product")  return "cube-outline";
  if (type === "store")    return "storefront-outline";
  return "grid-outline";
}

function typeLabel(type: SearchSuggestion["type"]): string {
  if (type === "product")  return "Product";
  if (type === "store")    return "Store";
  return "Category";
}

export default function SearchBar({
  onSearchChange,
  onQueryChange,
  suggestions = [],
  onSuggestionSelect,
  showSuggestions = true,
}: Props) {
  const [query, setQuery]       = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef         = useRef<TextInput>(null);
  const lastFocusTime    = useRef<number>(0);
  const refocusTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAnim        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onSearchChange?.(query);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query, onSearchChange]);

  useEffect(() => () => {
    if (refocusTimeout.current) clearTimeout(refocusTimeout.current);
  }, []);

  const animateFocus = (focused: boolean) => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleFocus = () => {
    lastFocusTime.current = Date.now();
    setIsFocused(true);
    animateFocus(true);
  };

  const handleBlur = () => {
    const timeSinceFocus = Date.now() - lastFocusTime.current;
    const isSpurious = Platform.OS === "android" && timeSinceFocus < 800;
    if (isSpurious) {
      refocusTimeout.current = setTimeout(() => {
        inputRef.current?.focus();
        refocusTimeout.current = null;
      }, 50);
      return;
    }
    setTimeout(() => {
      setIsFocused(false);
      animateFocus(false);
    }, 200);
  };

  const handleClear = () => {
    setQuery("");
    onQueryChange?.("");
    onSearchChange?.("");
    inputRef.current?.focus();
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    // Run navigation / parent handlers first so blur/keyboard teardown does not swallow the action.
    onSuggestionSelect?.(suggestion);
    setQuery("");
    onQueryChange?.("");
    onSearchChange?.("");
    setIsFocused(false);
    animateFocus(false);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EAEDF2", colors.primary],
  });

  const shouldShowDropdown = showSuggestions && isFocused && query.length > 1;

  return (
    <View style={s.wrapper} collapsable={false}>
      <Animated.View style={[s.inputRow, { borderColor }]} collapsable={false}>
        <Ionicons
          name="search-outline"
          size={17}
          color={isFocused ? colors.primary : "#B0B7C3"}
        />
        <TextInput
          ref={inputRef}
          placeholder="Search products, categories, stores..."
          style={s.input}
          placeholderTextColor="#B0B7C3"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            onQueryChange?.(text);
          }}
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
          <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={s.clearBtn}>
            <Ionicons name="close-circle" size={16} color="#B0B7C3" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Dropdown */}
      {shouldShowDropdown && (
        <View style={s.dropdown}>
          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions.slice(0, 8)}
              keyExtractor={(item) => item.id}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => {
                const productThumb =
                  item.type === "product" ? resolvePublicMediaUri(item.imageUrl) : null;
                return (
                <TouchableOpacity
                  style={[s.suggestionRow, index === 0 && s.suggestionRowFirst]}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.suggestionIcon, item.type === "store" && s.suggestionIconStore]}>
                    {productThumb ? (
                      <Image
                        source={{ uri: productThumb }}
                        style={s.suggestionThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons
                        name={typeIcon(item.type)}
                        size={13}
                        color={item.type === "store" ? "#EA580C" : colors.primary}
                      />
                    )}
                  </View>
                  <View style={s.suggestionContent}>
                    <Text style={s.suggestionName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.suggestionMeta}>
                      {item.type === "product" && item.categoryName
                        ? item.categoryName
                        : typeLabel(item.type)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={13} color="#C8CDD6" />
                </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={s.noResults}>
              <Ionicons name="search-outline" size={20} color="#C8CDD6" />
              <Text style={s.noResultsText}>No results for "{query}"</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
    backgroundColor: "transparent",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 10,
    paddingBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
    minHeight: 20,
  },
  clearBtn: {
    padding: 2,
  },

  // Dropdown
  dropdown: {
    position: "absolute",
    top: 62,
    left: SCREEN_PADDING,
    right: SCREEN_PADDING,
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#EAEDF2",
    overflow: "hidden",
    zIndex: 200,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F4F6F9",
  },
  suggestionRowFirst: {
    borderTopWidth: 0,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  suggestionIconStore: {
    backgroundColor: "#FFF7ED",
  },
  suggestionThumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F4F6F9",
  },
  suggestionContent: { flex: 1 },
  suggestionName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 1,
  },
  suggestionMeta: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
  noResults: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    justifyContent: "center",
  },
  noResultsText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});