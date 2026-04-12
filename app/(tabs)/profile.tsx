// app/(tabs)/profile.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { SCREEN_PADDING } from "@/constants/layout";
import { useAuth } from "@/context/AuthContext";

function Row({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon as never} size={20} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.disabled} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent={false} />

        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerBlob} />
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={colors.card} />
          </View>
          <Text style={styles.name}>{user?.name ?? "Guest"}</Text>
          <Text style={styles.email}>{user?.email ?? "Not signed in"}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Row
            icon="receipt-outline"
            label="Orders"
            onPress={() => router.push("/orders" as never)}
          />
          <Row
            icon="heart-outline"
            label="Wishlist"
            onPress={() => router.push("/(tabs)/wishlist" as never)}
          />
          <Row
            icon="grid-outline"
            label="All products"
            onPress={() => router.push("/(tabs)/products" as never)}
          />

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={async () => {
              try {
                await logout();
                setTimeout(() => router.replace("/(auth)/login" as never), 50);
              } catch {
                router.replace("/(auth)/login" as never);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>KTL Fresh · v1.0.0</Text>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 28,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  headerBlob: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.25,
    top: -60,
    right: -50,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    fontWeight: "500",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.error,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 28,
    fontWeight: "500",
  },
});
